import { ipcRenderer } from 'electron';
import { LlmSettings } from '../core/llm-settings';

// Expose ipcRenderer directly to the window object
// This is safe because nodeIntegration is true and contextIsolation is false
(window as typeof window & { electronAPI: unknown }).electronAPI = {
  // Path API
  getPath: (pathName: 'assets' | 'userData') => ipcRenderer.invoke('get-path', pathName),
  resolvePath: (pathName: 'assets' | 'userData' | 'customAssets', subpath: string) => ipcRenderer.invoke('resolve-path', pathName, subpath), // Legacy, to be removed
  basename: (filePath: string) => ipcRenderer.invoke('path:basename', filePath),
  fileExists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath), // Legacy, to be removed

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
  readAssetFile: async (filePath: string) => ipcRenderer.invoke('read-asset-file', filePath), // Legacy, to be removed
  readAbsoluteFile: async (filePath: string) => ipcRenderer.invoke('read-absolute-file', filePath),
  readFile: async (filePath: string) => ipcRenderer.invoke('readFile', filePath),

  // Action API
  playAnimation: (animationName: string, loop: boolean, crossFadeDuration: number) => ipcRenderer.invoke('play-animation', animationName, loop, crossFadeDuration),
  showMessage: (message: string, duration: number) => ipcRenderer.invoke('show-message', message, duration),
  setExpression: (expressionName: string, weight: number, duration: number) => ipcRenderer.invoke('set-expression', expressionName, weight, duration),
  
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
  
  // --- Mod Management ---
  getAllMods: () => ipcRenderer.invoke('get-all-mods'),
  getModSettings: () => ipcRenderer.invoke('get-mod-settings'),
  setModEnabled: (modName: string, isEnabled: boolean) => ipcRenderer.invoke('set-mod-enabled', modName, isEnabled),
  getPluginList: (): Promise<string[]> => ipcRenderer.invoke('get-plugin-list'),
  updatePluginList: (plugins: string[]) => ipcRenderer.send('update-plugin-list', plugins),

  // --- Sequence API ---
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
      getPath: (pathName: 'assets' | 'userData') => Promise<string>;
      resolvePath: (pathName: 'assets' | 'userData' | 'customAssets', subpath: string) => Promise<string>; // Legacy
      basename: (filePath: string) => Promise<string>;
      fileExists: (filePath: string) => Promise<boolean>; // Legacy

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
      readAssetFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>; // Legacy
      readAbsoluteFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;
      readFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;

      // Action API
      playAnimation: (animationName: string, loop: boolean, crossFadeDuration: number) => Promise<void>;
      showMessage: (message: string, duration: number) => Promise<void>;
      setExpression: (expressionName: string, weight: number, duration: number) => Promise<void>;

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