import { ipcRenderer } from 'electron';
import { LlmSettings } from '../core/llm-settings';

// Expose ipcRenderer directly to the window object
// This is safe because nodeIntegration is true and contextIsolation is false
(window as typeof window & { electronAPI: unknown }).electronAPI = {
  // Path API
  basename: (filePath: string) => ipcRenderer.invoke('path:basename', filePath),

  // App control
  quitApp: () => ipcRenderer.send('quit-app'),
  requestToggleMouseIgnore: () => ipcRenderer.send('request-toggle-mouse-ignore'),

  // File System API
  saveVrmaAnimation: (animationData: ArrayBuffer) => ipcRenderer.invoke('save-vrma-animation', animationData),
  saveVrmaPose: (poseData: ArrayBuffer) => ipcRenderer.invoke('save-vrma-pose', poseData),
  openVrmFile: () => ipcRenderer.invoke('open-vrm-file'),
  openVrmaFile: () => ipcRenderer.invoke('open-vrma-file'),
  savePersonaToFile: (persona: string) => ipcRenderer.invoke('save-persona-to-file', persona),
  openPersonaFile: () => ipcRenderer.invoke('open-persona-file'),
  readAbsoluteFile: async (filePath: string) => ipcRenderer.invoke('read-absolute-file', filePath),
  openInExplorer: (assetType: 'vrm' | 'animation' | 'pose') => ipcRenderer.invoke('resource:open-in-explorer', assetType),
  readLlmMemory: () => ipcRenderer.invoke('llm-memory:read'),
  writeLlmMemory: (memoryData: any) => ipcRenderer.invoke('llm-memory:write', memoryData),

  // Action API
  'character.playAnimation': (animationName: string, loop: boolean, crossFadeDuration: number) => ipcRenderer.invoke('character.playAnimation', animationName, loop, crossFadeDuration),
  'ui.showMessage': (message: string, duration: number) => ipcRenderer.invoke('ui.showMessage', message, duration),
  'character.setExpression': (expressionName: string, weight: number, duration: number) => ipcRenderer.invoke('character.setExpression', expressionName, weight, duration),
  
  // Event Bus
  on: (channel: string, listener: (...args: any[]) => void) => {
    const subscription = (event: any, ...args: any[]) => listener(...args);
    ipcRenderer.on(channel, subscription);
    
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },

  // --- Character State ---
  onLoadCharacterState: (listener: (state: any) => void) => {
    const subscription = (event: any, state: any) => listener(state);
    ipcRenderer.on('character-state:load', subscription);
    return () => ipcRenderer.removeListener('character-state:load', subscription);
  },
  sendCharacterStateChanged: (newState: any) => {
    ipcRenderer.send('character-state:changed', newState);
  },

  // --- Settings ---
  setWindowOpacity: (opacity: number) => ipcRenderer.send('set-window-opacity', opacity),
  getWindowOpacity: () => ipcRenderer.invoke('get-window-opacity'),
  setPersona: (persona: string) => ipcRenderer.send('set-persona', persona),
  getPersona: () => ipcRenderer.invoke('get-persona'),
  getLlmSettings: (): Promise<LlmSettings> => ipcRenderer.invoke('get-llm-settings'),
  setLlmSettings: (settings: LlmSettings) => ipcRenderer.send('set-llm-settings', settings),
  getMouseIgnoreShortcut: () => ipcRenderer.invoke('get-mouse-ignore-shortcut'),
  setMouseIgnoreShortcut: (shortcut: string) => ipcRenderer.send('set-mouse-ignore-shortcut', shortcut),
  getLanguage: (): Promise<string> => ipcRenderer.invoke('get-language'),
  setLanguage: (language: string) => ipcRenderer.send('set-language', language),
  getAvailableLanguages: (): Promise<string[]> => ipcRenderer.invoke('get-available-languages'),
  
  // --- Mod Management ---
  getAllMods: () => ipcRenderer.invoke('get-all-mods'),
  getModSettings: () => ipcRenderer.invoke('get-mod-settings'),
  setModEnabled: (modName: string, isEnabled: boolean) => ipcRenderer.invoke('set-mod-enabled', modName, isEnabled),
  getPluginList: (): Promise<string[]> => ipcRenderer.invoke('get-plugin-list'),
  updatePluginList: (plugins: string[]) => ipcRenderer.send('update-plugin-list', plugins),

  // --- Sequence API ---
      listAssets: (assetType: 'vrm' | 'animation' | 'pose' | 'image' | 'sequence') => ipcRenderer.invoke('list-assets', assetType),
      getAllSequenceFilesWithType: (): Promise<{ name: string, type: 'sequence' | 'subroutine' }[]> => ipcRenderer.invoke('get-all-sequence-files-with-type'),
  getSequenceFiles: (): Promise<string[]> => ipcRenderer.invoke('get-sequence-files'),
  getSubroutineFiles: (): Promise<string[]> => ipcRenderer.invoke('get-subroutine-files'),
  saveSequence: (sequenceData: string) => ipcRenderer.invoke('save-sequence', sequenceData),
  saveSequenceToFile: (fileName: string, sequenceData: string) => ipcRenderer.invoke('save-sequence-to-file', fileName, sequenceData),
  loadSequence: () => ipcRenderer.invoke('load-sequence'),
  deleteSequence: (sequenceFile: string): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke('delete-sequence', sequenceFile),
  getActiveSequences: (): Promise<string[]> => ipcRenderer.invoke('get-active-sequences'),
  setActiveSequences: (activeSequences: string[]) => ipcRenderer.send('set-active-sequences', activeSequences),
};

console.log('Preload script loaded.');


// --- Type Declarations for Renderer ---
// This allows TypeScript in the renderer process to know about the exposed API.
declare global {
  interface Window {
    electronAPI: {
      // Path API
      basename: (filePath: string) => Promise<string>;

      // App control
      quitApp: () => void;
      requestToggleMouseIgnore: () => void;

      // File System API
      saveVrmaAnimation: (animationData: ArrayBuffer) => Promise<{ success: boolean, message?: string, error?: string }>;
      saveVrmaPose: (poseData: ArrayBuffer) => Promise<{ success: boolean, message?: string, error?: string }>;
      openVrmFile: () => Promise<{ success: boolean, filePath: string } | null>;
      openVrmaFile: () => Promise<{ success: boolean, filePath: string } | null>;
      savePersonaToFile: (persona: string) => Promise<{ success: boolean, message?: string, error?: string }>;
      openPersonaFile: () => Promise<string | null>;
      readAbsoluteFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;
      openInExplorer: (assetType: 'vrm' | 'animation' | 'pose') => Promise<void>;
      readLlmMemory: () => Promise<any>;
      writeLlmMemory: (memoryData: any) => Promise<{ success: boolean, error?: string }>;

      // Action API
      'character.playAnimation': (animationName: string, loop: boolean, crossFadeDuration: number) => Promise<void>;
      'ui.showMessage': (message: string, duration: number) => Promise<void>;
      'character.setExpression': (expressionName: string, weight: number, duration: number) => Promise<void>;

      // Event Bus
      on: (channel: string, listener: (...args: any[]) => void) => () => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: <T>(channel: string, ...args: any[]) => Promise<T>;

      // --- Character State ---
      onLoadCharacterState: (listener: (state: any) => void) => () => void;
      sendCharacterStateChanged: (newState: any) => void;

      // --- Settings ---
      setWindowOpacity: (opacity: number) => void;
      getWindowOpacity: () => Promise<number>;
      setPersona: (persona: string) => void;
      getPersona: () => Promise<string>;
      getLlmSettings: () => Promise<LlmSettings>;
      setLlmSettings: (settings: LlmSettings) => void;
      getMouseIgnoreShortcut: () => Promise<string>;
      setMouseIgnoreShortcut: (shortcut: string) => void;
      getLanguage: () => Promise<string>;
      setLanguage: (language: string) => void;
      getAvailableLanguages: () => Promise<string[]>;

      // --- Mod Management ---
      getAllMods: () => Promise<{ name: string, version: string, path: string }[]>;
      getModSettings: () => Promise<any>;
      setModEnabled: (modName: string, isEnabled: boolean) => Promise<{ success: boolean }>;
      getPluginList: () => Promise<string[]>;
      updatePluginList: (plugins: string[]) => void;

      // --- Sequence API ---
      listAssets: (assetType: 'vrm' | 'animation' | 'pose' | 'image' | 'sequence') => Promise<string[]>;
      getAllSequenceFilesWithType: () => Promise<{ name: string, type: 'sequence' | 'subroutine' }[]>;
      getSequenceFiles: () => Promise<string[]>;
      getSubroutineFiles: () => Promise<string[]>;
      saveSequence: (sequenceData: string) => Promise<{ success: boolean, filePath?: string, error?: string, canceled?: boolean }>;
      saveSequenceToFile: (fileName: string, sequenceData: string) => Promise<{ success: boolean, filePath?: string, error?: string }>;
      loadSequence: () => Promise<{ success: boolean, data?: string, filePath?: string, error?: string, canceled?: boolean }>;
      deleteSequence: (sequenceFile: string) => Promise<{ success: boolean, error?: string }>;
      getActiveSequences: () => Promise<string[]>;
      setActiveSequences: (activeSequences: string[]) => void;
    };
  }
}