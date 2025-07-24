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
};