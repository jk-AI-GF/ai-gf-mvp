import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import * as THREE from 'three';
import VRMCanvas from '../components/scene/VRMCanvas';
import { VRMManager } from '../vrm-manager';
import { PluginManager } from '../../plugins/plugin-manager';
import { ChatService } from '../chat-service';
import { LlmSettings, DEFAULT_LLM_SETTINGS } from '../../core/llm-settings';
import { CustomTriggerManager } from '../../core/custom-trigger-manager';
import { ActionRegistry } from '../../core/action-registry'; // 추가
import { SequenceManager } from '../../core/sequence/SequenceManager';

interface AppContextType {
  vrmManager: VRMManager | null;
  pluginManager: PluginManager | null;
  customTriggerManager: CustomTriggerManager | null;
  actionRegistry: ActionRegistry | null; // 추가
  sequenceManager: SequenceManager | null;
  chatService: ChatService | null;
  directionalLight: THREE.DirectionalLight | null;
  ambientLight: THREE.AmbientLight | null;
  isUiInteractive: boolean;
  windowOpacity: number;
  persona: string;
  llmSettings: LlmSettings;
  renderer: THREE.WebGLRenderer | null; // 추가
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
  const [customTriggerManager, setCustomTriggerManager] = useState<CustomTriggerManager | null>(null);
  const [actionRegistry, setActionRegistry] = useState<ActionRegistry | null>(null); // 추가
  const [sequenceManager, setSequenceManager] = useState<SequenceManager | null>(null);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [directionalLight, setDirectionalLight] = useState<THREE.DirectionalLight | null>(null);
  const [ambientLight, setAmbientLight] = useState<THREE.AmbientLight | null>(null);
  const [isUiInteractive, setUiInteractive] = useState(true);
  const [windowOpacity, setWindowOpacityState] = useState(1.0);
  const [persona, setPersonaState] = useState('');
  const [llmSettings, setLlmSettingsState] = useState<LlmSettings>(DEFAULT_LLM_SETTINGS);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null); // 추가

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
    customTriggerManager: CustomTriggerManager;
    actionRegistry: ActionRegistry; // 추가
    renderer: THREE.WebGLRenderer; // 추가
  }) => {
    setVrmManager(managers.vrmManager);
    setPluginManager(managers.pluginManager);
    setCustomTriggerManager(managers.customTriggerManager);
    setActionRegistry(managers.actionRegistry); // 추가
    setRenderer(managers.renderer); // 추가
    setChatService(new ChatService(managers.vrmManager, managers.pluginManager));

    // Now that pluginManager is initialized, we can get its context and create the SequenceManager
    const context = managers.pluginManager.context;
    if (context) {
      const seqManager = new SequenceManager(context);
      seqManager.initialize().then(() => {
        setSequenceManager(seqManager);
        console.log("SequenceManager initialized and sequences loaded.");

        // Register sequence-related actions now that we have the manager
        if (managers.actionRegistry && !managers.actionRegistry.get('executeSequence')) {
          managers.actionRegistry.register(
            {
              name: 'executeSequence',
              description: '다른 시퀀스를 실행합니다.',
              params: [
                {
                  name: 'sequenceId',
                  type: 'string',
                  description: '실행할 시퀀스의 파일 이름',
                  dynamicOptions: 'sequences',
                },
              ],
            },
            (sequenceId: string) => {
              console.log(`[Action] Executing sequence: ${sequenceId}`);
              seqManager.runSequenceById(sequenceId);
            }
          );
          console.log('[AppContext] "executeSequence" action registered.');
        }
      }).catch(err => {
        console.error("Failed to initialize SequenceManager:", err);
      });
    } else {
      console.error("Failed to get PluginContext, SequenceManager could not be initialized.");
    }
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
    customTriggerManager,
    actionRegistry, // 추가
    sequenceManager,
    chatService,
    directionalLight,
    ambientLight,
    isUiInteractive,
    windowOpacity,
    persona,
    llmSettings,
    renderer, // 추가
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
