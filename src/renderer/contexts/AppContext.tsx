import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import * as THREE from 'three';
import VRMCanvas from '../components/scene/VRMCanvas';
import { VRMManager } from '../vrm-manager';
import { PluginManager } from '../../plugins/plugin-manager';
import { ChatService } from '../chat-service';
import { LlmSettings, DEFAULT_LLM_SETTINGS } from '../../core/llm-settings';
import { ActionRegistry } from '../../core/action-registry';
import { SequenceManager } from '../../core/sequence/SequenceManager';
import { registerCoreActions } from '../../core/action-registrar';
import { CharacterStateManager } from '../../core/character-state-manager';

interface AppContextType {
  vrmManager: VRMManager | null;
  pluginManager: PluginManager | null;
  actionRegistry: ActionRegistry | null;
  sequenceManager: SequenceManager | null;
  chatService: ChatService | null;
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
  const [vrmManager, setVrmManager] = useState<VRMManager | null>(null);
  const [pluginManager, setPluginManager] = useState<PluginManager | null>(null);
  const [actionRegistry, setActionRegistry] = useState<ActionRegistry | null>(null);
  const [sequenceManager, setSequenceManager] = useState<SequenceManager | null>(null);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [directionalLight, setDirectionalLight] = useState<THREE.DirectionalLight | null>(null);
  const [ambientLight, setAmbientLight] = useState<THREE.AmbientLight | null>(null);
  const [isUiInteractive, setUiInteractive] = useState(true);
  const [windowOpacity, setWindowOpacityState] = useState(1.0);
  const [persona, setPersonaState] = useState('');
  const [llmSettings, setLlmSettingsState] = useState<LlmSettings>(DEFAULT_LLM_SETTINGS);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    window.electronAPI.getWindowOpacity().then(setWindowOpacityState);
    window.electronAPI.getPersona().then(setPersonaState);
    window.electronAPI.getLlmSettings().then(settings => {
      if (settings) {
        setLlmSettingsState(prev => ({ ...prev, ...settings }));
      }
    });

    const handleUiModeChange = (isInteractive: boolean) => {
      setUiInteractive(isInteractive);
    };
    const unsubscribe = window.electronAPI.on('set-ui-interactive-mode', handleUiModeChange);
    return () => unsubscribe();
  }, []);

  const handleManagersLoad = useCallback((managers: {
    vrmManager: VRMManager;
    pluginManager: PluginManager;
    actionRegistry: ActionRegistry;
    sequenceManager: SequenceManager;
    renderer: THREE.WebGLRenderer;
    camera: THREE.Camera;
  }) => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    // Set all managers from VRMCanvas
    setVrmManager(managers.vrmManager);
    setPluginManager(managers.pluginManager);
    setActionRegistry(managers.actionRegistry);
    setRenderer(managers.renderer);
    setSequenceManager(managers.sequenceManager);
    setChatService(new ChatService(managers.vrmManager, managers.pluginManager));

    console.log('[AppContext] All managers received and set.');
  }, []);

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
    vrmManager, 
    pluginManager, 
    actionRegistry,
    sequenceManager,
    chatService,
    directionalLight,
    ambientLight,
    isUiInteractive,
    windowOpacity,
    persona,
    llmSettings,
    renderer,
    setWindowOpacity,
    setPersona,
    setLlmSettings,
    setDirectionalLight,
    setAmbientLight,
  };

  return (
    <AppContext.Provider value={value}>
      <VRMCanvas onLoad={handleManagersLoad} />
      {vrmManager && pluginManager && chatService && children}
    </AppContext.Provider>
  );
};
