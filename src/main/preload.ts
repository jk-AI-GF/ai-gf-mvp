import { ipcRenderer } from 'electron';
import { LlmSettings } from '../core/llm-settings';

// Expose ipcRenderer directly to the window object
// This is safe because nodeIntegration is true and contextIsolation is false
(window as typeof window & { electronAPI: unknown }).electronAPI = {
  // Path API
  getPath: (pathName: 'assets' | 'userData') => ipcRenderer.invoke('get-path', pathName),
  resolvePath: (pathName: 'assets' | 'userData', subpath: string) => ipcRenderer.invoke('resolve-path', pathName, subpath),
      fileExists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),

      // App control
      quitApp: () => ipcRenderer.send('quit-app'),
  toggleMouseIgnore: () => ipcRenderer.send('toggle-mouse-ignore'),

  // File System API
  listDirectory: async (dirPath: string, basePath: 'assets' | 'userData' = 'assets') => ipcRenderer.invoke('list-directory', dirPath, basePath),
  saveVrmaPose: (poseData: ArrayBuffer) => ipcRenderer.invoke('save-vrma-pose', poseData),
  openVrmFile: () => ipcRenderer.invoke('open-vrm-file'),
  openVrmaFile: () => ipcRenderer.invoke('open-vrma-file'),
  savePersonaToFile: (persona: string) => ipcRenderer.invoke('save-persona-to-file', persona),
  openPersonaFile: () => ipcRenderer.invoke('open-persona-file'),
  readAssetFile: async (filePath: string) => ipcRenderer.invoke('read-asset-file', filePath),
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
};

console.log('Preload script loaded.');
