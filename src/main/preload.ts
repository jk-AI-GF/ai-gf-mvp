import { ipcRenderer } from 'electron';

// Expose ipcRenderer directly to the window object
// This is safe because nodeIntegration is true and contextIsolation is false
(window as typeof window & { electronAPI: unknown }).electronAPI = {
  listDirectory: async (dirPath: string) => ipcRenderer.invoke('list-directory', dirPath),
  saveVrmaPose: (poseData: ArrayBuffer) => ipcRenderer.invoke('save-vrma-pose', poseData),
  openVrmFile: () => ipcRenderer.invoke('open-vrm-file'),
  openVrmaFile: () => ipcRenderer.invoke('open-vrma-file'),
  savePersonaToFile: (persona: string) => ipcRenderer.invoke('save-persona-to-file', persona),
  openPersonaFile: () => ipcRenderer.invoke('open-persona-file'),
  readAssetFile: async (filePath: string) => ipcRenderer.invoke('read-asset-file', filePath),
  readAbsoluteFile: async (filePath: string) => ipcRenderer.invoke('read-absolute-file', filePath),
  playAnimation: (animationName: string, loop: boolean, crossFadeDuration: number) => ipcRenderer.invoke('play-animation', animationName, loop, crossFadeDuration),
  showMessage: (message: string, duration: number) => ipcRenderer.invoke('show-message', message, duration),
  setExpression: (expressionName: string, weight: number, duration: number) => ipcRenderer.invoke('set-expression', expressionName, weight, duration),
  on: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (event, ...args) => listener(...args));
  },
};