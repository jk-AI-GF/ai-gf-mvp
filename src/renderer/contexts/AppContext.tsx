import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import VRMCanvas from '../components/scene/VRMCanvas';
import { VRMManager } from '../vrm-manager';
import { PluginManager } from '../../plugins/plugin-manager';
import { ChatService } from '../chat-service';

interface AppContextType {
  vrmManager: VRMManager | null;
  pluginManager: PluginManager | null;
  chatService: ChatService | null;
  directionalLight: THREE.DirectionalLight | null;
  ambientLight: THREE.AmbientLight | null;
  isUiInteractive: boolean;
  windowOpacity: number;
  apiKey: string;
  persona: string;
  setWindowOpacity: (opacity: number) => void;
  setApiKey: (key: string) => void;
  setPersona: (persona: string) => void;
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
  const [apiKey, setApiKeyState] = useState('');
  const [persona, setPersonaState] = useState('');

  useEffect(() => {
    // Fetch all settings when the app loads
    window.electronAPI.getWindowOpacity().then(setWindowOpacityState);
    window.electronAPI.getSettings().then(settings => {
      setApiKeyState(settings.apiKey);
      setPersonaState(settings.persona);
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

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    window.electronAPI.setApiKey(key);
  };

  const setPersona = (newPersona: string) => {
    setPersonaState(newPersona);
    window.electronAPI.setPersona(newPersona);
  };

  const value = { 
    vrmManager, 
    pluginManager, 
    chatService,
    directionalLight,
    ambientLight,
    isUiInteractive,
    windowOpacity,
    apiKey,
    persona,
    setWindowOpacity,
    setApiKey,
    setPersona,
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
