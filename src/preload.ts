import { ipcRenderer } from 'electron';

// Expose ipcRenderer directly to the window object
// This is safe because nodeIntegration is true and contextIsolation is false
(window as any).electronAPI = {
  listDirectory: async (dirPath: string) => ipcRenderer.invoke('list-directory', dirPath),
};