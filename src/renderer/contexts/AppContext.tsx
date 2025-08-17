import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import * as THREE from 'three';
import VRMCanvas from '../components/scene/VRMCanvas';
import { VRMManager } from '../vrm-manager';
import { PluginManager } from '../../plugins/plugin-manager';
import { ChatService } from '../chat-service';
import { LlmSettings, DEFAULT_LLM_SETTINGS } from '../../core/llm-settings';
import { ActionRegistry } from '../../core/action-registry';
import { DataProviderRegistry } from '../../core/sequence/data-provider-registry';
import { SequenceManager } from '../../core/sequence/SequenceManager';
import { registerCoreActions } from '../../core/action-registrar';
import { registerCoreDataProviders } from '../../core/sequence/data-provider-registrar';
import { ContextStore } from '../../core/context-store';
import { CharacterStateManager } from '../../core/character-state-manager';
import { createPluginContext } from '../../plugin-api/context-factory';
import eventBus from '../../core/event-bus';
import { SystemControls } from '../../plugin-api/system-controls';
import { toggleTts, setMasterVolume } from '../audio-service';
import { AutoLookAtPlugin } from '../../plugins/auto-look-at-plugin';
import { AutoBlinkPlugin } from '../../plugins/auto-blink-plugin';
import { AutoIdleAnimationPlugin } from '../../plugins/auto-idle-animation-plugin';
import { ProactiveDialoguePlugin } from '../../plugins/proactive-dialogue-plugin';
import { ActionTestPlugin } from '../../plugins/action-test-plugin';
import { GrabVrmPlugin } from '../../plugins/grab-vrm-plugin';
import { GravityPlugin } from '../../plugins/gravity-plugin';
import { LlmResponseHandlerPlugin } from '../../plugins/LlmResponseHandlerPlugin';
import { InteractionTrackerPlugin } from '../../plugins/interaction-tracker-plugin';
import { ImageAssetManager } from '../image-asset-manager';

interface AppContextType {
  vrmManager: VRMManager | null;
  pluginManager: PluginManager | null;
  imageAssetManager: ImageAssetManager | null;
  actionRegistry: ActionRegistry | null;
  dataProviderRegistry: DataProviderRegistry | null;
  sequenceManager: SequenceManager | null;
  chatService: ChatService | null;
  contextStore: ContextStore | null;
  directionalLight: THREE.DirectionalLight | null;
  ambientLight: THREE.AmbientLight | null;
  isUiInteractive: boolean;
  windowOpacity: number;
  persona: string;
  llmSettings: LlmSettings;
  renderer: THREE.WebGLRenderer | null;
  setWindowOpacity: (opacity: number) => void;
  setPersona: (persona: string) => void;
  setLlmSettings: (settings: Partial<LlmSettings>) => void;
  setDirectionalLight: (light: THREE.DirectionalLight) => void;
  setAmbientLight: (light: THREE.AmbientLight) => void;
  isSequenceManagerInitialized: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [managers, setManagers] = useState<{
    vrmManager: VRMManager | null;
    pluginManager: PluginManager | null;
    imageAssetManager: ImageAssetManager | null;
    actionRegistry: ActionRegistry | null;
    dataProviderRegistry: DataProviderRegistry | null;
    sequenceManager: SequenceManager | null;
    chatService: ChatService | null;
    contextStore: ContextStore | null;
    renderer: THREE.WebGLRenderer | null;
  }>({
    vrmManager: null,
    pluginManager: null,
    imageAssetManager: null,
    actionRegistry: null,
    dataProviderRegistry: null,
    sequenceManager: null,
    chatService: null,
    contextStore: null,
    renderer: null,
  });

  const [isSequenceManagerInitialized, setSequenceManagerInitialized] = useState(false);
  const [directionalLight, setDirectionalLight] = useState<THREE.DirectionalLight | null>(null);
  const [ambientLight, setAmbientLight] = useState<THREE.AmbientLight | null>(null);
  const [isUiInteractive, setUiInteractive] = useState(true);
  const [windowOpacity, setWindowOpacityState] = useState(1.0);
  const [persona, setPersonaState] = useState('');
  const [llmSettings, setLlmSettingsState] = useState<LlmSettings>(DEFAULT_LLM_SETTINGS);

  // Memoize core managers to ensure they are created only once
  const coreManagers = useMemo(() => {
    console.log('[AppContext] Initializing core managers...');
    const contextStore = new ContextStore();
    const actionRegistry = new ActionRegistry();
    const dataProviderRegistry = new DataProviderRegistry();
    const imageAssetManager = new ImageAssetManager(eventBus);
    
    const systemControls: SystemControls = {
      toggleTts: (enable: boolean) => toggleTts(enable),
      toggleMouseIgnore: () => window.electronAPI.requestToggleMouseIgnore(),
      setMasterVolume: (volume: number) => setMasterVolume(volume),
    };

    // Create a preliminary context that will be fleshed out later
    const pluginContext = createPluginContext(null, systemControls, actionRegistry, contextStore);
    
    const pluginManager = new PluginManager(pluginContext);
    
    // Add the fully-formed contextStore to the context object
    pluginContext.contextStore = contextStore;
    pluginContext.imageAssetManager = imageAssetManager;

    return { contextStore, actionRegistry, dataProviderRegistry, pluginManager, imageAssetManager };
  }, []);

  useEffect(() => {
    window.electronAPI.getWindowOpacity().then(setWindowOpacityState);
    window.electronAPI.getPersona().then(setPersonaState);
    window.electronAPI.getLlmSettings().then(settings => {
      if (settings) setLlmSettingsState(prev => ({ ...prev, ...settings }));
    });

    const handleUiModeChange = (isInteractive: boolean) => setUiInteractive(isInteractive);
    const unsubscribe = window.electronAPI.on('set-ui-interactive-mode', handleUiModeChange);
    return () => unsubscribe();
  }, []);

  const handleCanvasLoad = useCallback((loadedInstances: {
    vrmManager: VRMManager;
    renderer: THREE.WebGLRenderer;
  }) => {
    console.log('[AppContext] VRMCanvas loaded, finalizing managers...');
    const { vrmManager, renderer } = loadedInstances;
    const { contextStore, actionRegistry, dataProviderRegistry, pluginManager, imageAssetManager } = coreManagers;

    // Now that we have the vrmManager, update the plugin context
    pluginManager.context.vrmManager = vrmManager;
    pluginManager.context.pluginManager = pluginManager;

    const charStateManager = new CharacterStateManager();
    pluginManager.context.characterStateManager = charStateManager;
    pluginManager.context.dataProviderRegistry = dataProviderRegistry;

    const sequenceManager = new SequenceManager(pluginManager.context);
    pluginManager.context.sequenceManager = sequenceManager;

    const chatService = new ChatService(vrmManager, pluginManager);

    // IMPORTANT: Register core actions and data providers now that the context is fully populated
    registerCoreActions(actionRegistry, pluginManager.context, renderer, chatService);
    registerCoreDataProviders(dataProviderRegistry, pluginManager.context);
    console.log('[AppContext] Core actions and data providers registered.');

    // Register all plugins
    pluginManager.register(new AutoLookAtPlugin());
    pluginManager.register(new AutoBlinkPlugin());
    pluginManager.register(new AutoIdleAnimationPlugin());
    pluginManager.register(new ProactiveDialoguePlugin());
    pluginManager.register(new ActionTestPlugin());
    pluginManager.register(new GrabVrmPlugin());
    pluginManager.register(new GravityPlugin());
    pluginManager.register(new LlmResponseHandlerPlugin());
    pluginManager.register(new InteractionTrackerPlugin());
    console.log('[AppContext] All plugins registered.');

    setManagers({
      vrmManager,
      pluginManager,
      imageAssetManager,
      actionRegistry,
      dataProviderRegistry,
      sequenceManager,
      chatService,
      contextStore,
      renderer,
    });

    sequenceManager.initialize().then(() => {
      console.log("[AppContext] SequenceManager initialized.");
      setSequenceManagerInitialized(true); // Signal that initialization is complete
                // VRM 모델을 로드합니다. 파일명만 전달해야 합니다.
          vrmManager.loadVRM('Liqu.vrm');
    }).catch((err: any) => console.error("Failed to initialize SequenceManager:", err));

  }, [coreManagers]);

  const setWindowOpacity = (opacity: number) => {
    setWindowOpacityState(opacity);
    window.electronAPI.setWindowOpacity(opacity);
  };
  
  const setPersona = (newPersona: string) => {
    setPersonaState(newPersona);
    window.electronAPI.setPersona(newPersona);
  };

  const setLlmSettings = (newSettings: Partial<LlmSettings>) => {
    const updatedSettings = { ...llmSettings, ...newSettings };
    setLlmSettingsState(updatedSettings);
    window.electronAPI.setLlmSettings(updatedSettings);
  };

  const value = { 
    ...managers,
    directionalLight,
    ambientLight,
    isUiInteractive,
    windowOpacity,
    persona,
    llmSettings,
    setWindowOpacity,
    setPersona,
    setLlmSettings,
    setDirectionalLight,
    setAmbientLight,
    isSequenceManagerInitialized,
  };

  return (
    <AppContext.Provider value={value}>
      <VRMCanvas 
        pluginManager={coreManagers.pluginManager}
        onLoad={handleCanvasLoad} 
      />
      {managers.vrmManager && managers.pluginManager && managers.chatService && children}
    </AppContext.Provider>
  );
};

