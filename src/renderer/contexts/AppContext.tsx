import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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
    renderer: THREE.WebGLRenderer;
    camera: THREE.Camera;
  }) => {
    // Set all managers from VRMCanvas
    setVrmManager(managers.vrmManager);
    setPluginManager(managers.pluginManager);
    setActionRegistry(managers.actionRegistry);
    setRenderer(managers.renderer);
    setChatService(new ChatService(managers.vrmManager, managers.pluginManager));

    // IMPORTANT: Update VRMManager with the final active camera
    managers.vrmManager.setActiveCamera(managers.camera);

    // IMPORTANT: Register core actions now that all managers and cameras are ready
    registerCoreActions(managers.actionRegistry, managers.vrmManager, managers.renderer);
    console.log('[AppContext] Core actions registered.');

    // Now that pluginManager is initialized, we can get its context and create the SequenceManager
    const context = managers.pluginManager.context;
    if (context) {
      // 전역 행동 상태 및 리소스 잠금을 관리할 매니저를 생성 및 주입
      const charStateManager = new CharacterStateManager();
      context.characterStateManager = charStateManager;
      const seqManager = new SequenceManager(context);
      context.sequenceManager = seqManager;
      
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

        // Register runSubroutine action
        if (managers.actionRegistry && !managers.actionRegistry.get('runSubroutine')) {
          managers.actionRegistry.register(
            {
              name: 'runSubroutine',
              description: '지정된 인수를 사용하여 서브루틴을 실행합니다.',
              params: [
                {
                  name: 'subroutineId',
                  type: 'string',
                  description: '실행할 서브루틴의 파일 이름',
                  dynamicOptions: 'subroutines', // This tells the UI to populate a dropdown with subroutine files
                },
                {
                  name: 'args',
                  type: 'any',
                  description: '서브루틴에 전달할 인수(키-값 쌍)',
                },
              ],
            },
            (subroutineId: string, args: Record<string, any>) => {
              console.log(`[Action] Running subroutine: ${subroutineId} with args:`, args);
              seqManager.runSubroutine(subroutineId, args);
            }
          );
          console.log('[AppContext] "runSubroutine" action registered.');
        }
      }).catch((err: any) => {
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
