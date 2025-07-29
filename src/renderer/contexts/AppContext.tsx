import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import VRMCanvas from '../components/scene/VRMCanvas';
import { VRMManager } from '../vrm-manager';
import { PluginManager } from '../../plugins/plugin-manager';
import { ChatService } from '../chat-service';
import { LlmSettings, DEFAULT_LLM_SETTINGS } from '../../core/llm-settings';

interface AppContextType {
  vrmManager: VRMManager | null;
  pluginManager: PluginManager | null;
  chatService: ChatService | null;
  directionalLight: THREE.DirectionalLight | null;
  ambientLight: THREE.AmbientLight | null;
  isUiInteractive: boolean;
  windowOpacity: number;
  persona: string;
  llmSettings: LlmSettings;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vrmManager, setVrmManager] = useState<VRMManager | null>(null);
  const [pluginManager, setPluginManager] = useState<PluginManager | null>(null);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [directionalLight, setDirectionalLight] = useState<THREE.DirectionalLight | null>(null);
  const [ambientLight, setAmbientLight] = useState<THREE.AmbientLight | null>(null);
  const [isUiInteractive, setUiInteractive] = useState(true);
  const [windowOpacity, setWindowOpacityState] = useState(1.0);
  const [persona, setPersonaState] = useState('');
  const [llmSettings, setLlmSettingsState] = useState<LlmSettings>(DEFAULT_LLM_SETTINGS);

  useEffect(() => {
    // Fetch all settings when the app loads
    window.electronAPI.getWindowOpacity().then(setWindowOpacityState);
    window.electronAPI.getPersona().then(setPersonaState);
    window.electronAPI.getLlmSettings().then(settings => {
      if (settings) {
        // 저장된 설정과 기본 설정을 병합하여 항상 모든 필드를 보장
        setLlmSettingsState(prev => ({ ...prev, ...settings }));
      }
    });

    const handleUiModeChange = (isInteractive: boolean) => {
      setUiInteractive(isInteractive);
    };
    const unsubscribe = window.electronAPI.on('set-ui-interactive-mode', handleUiModeChange);
    return () => unsubscribe();
  }, []);

  const handleManagersLoad = useCallback((managers: { vrmManager: VRMManager; pluginManager: PluginManager }) => {
    setVrmManager(managers.vrmManager);
    setPluginManager(managers.pluginManager);
    setChatService(new ChatService(managers.vrmManager, managers.pluginManager));
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
    chatService,
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
  };

  return (
    <AppContext.Provider value={value}>
      <VRMCanvas 
        onLoad={handleManagersLoad} 
      />
      {vrmManager && pluginManager && chatService && children}
    </AppContext.Provider>
  );
};
