import { app, BrowserWindow, Tray, Menu, globalShortcut, dialog, session, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { ModLoader } from '../core/mod-loader';
import { createEventBus, AppEvents } from '../core/event-bus';
import { TriggerEngine } from '../core/trigger-engine';
import { ContextStore } from '../core/context-store';
import { ModSettingsManager } from '../core/mod-settings-manager';
import { LlmSettings, DEFAULT_LLM_SETTINGS } from '../core/llm-settings';

// Define the schema for electron-store
interface StoreSchema {
  windowOpacity: number;
  persona: string;
  llmSettings: LlmSettings;
}

// Store 인스턴스 생성
const store = new Store<StoreSchema>({
  defaults: {
    windowOpacity: 1.0,
    persona: '당신은 친절하고 상냥한 AI 여자친구입니다. 항상 사용자에게 긍정적이고 다정한 태도로 대화에 임해주세요.',
    llmSettings: DEFAULT_LLM_SETTINGS,
  }
});

process.on('uncaughtException', (error) => {
  const message = error.stack || error.message || 'Unknown error';
  dialog.showErrorBox('A JavaScript error occurred in the main process', message);
  app.quit();
});

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let tray: Tray | null = null;
let overlayWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let isIgnoringMouseEvents = false;

const assetsRoot = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(app.getAppPath(), 'assets');

const createOverlayWindow = (): void => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  // Create the browser window.
  overlayWindow = new BrowserWindow({
    height,
    width,
    x: 0,
    y: 0,
    skipTaskbar: true,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: true,
    alwaysOnTop: true,
    show: false, // Start hidden
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY, // Add preload script
      webSecurity: true,
      nodeIntegration: true,
      contextIsolation: false,
      webgl: true,
    },
  });

  // and load the overlay.html of the app.
  overlayWindow.loadURL(OVERLAY_WINDOW_WEBPACK_ENTRY);

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
};

const toggleOverlayWindow = (): void => {
  if (!overlayWindow) {
    console.log('Overlay window does not exist.');
    return;
  }

  if (overlayWindow.isVisible()) {
    overlayWindow.hide();
    mainWindow?.show(); // Show the main window when hiding the overlay
  } else {
    overlayWindow.show();
    mainWindow?.hide(); // Hide the main window when showing the overlay
  }
};

const createTray = (): void => {
  const iconPath = path.join(assetsRoot, 'icon.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Toggle Overlay', click: () => toggleOverlayWindow() },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('AI-GF MVP');
  tray.setContextMenu(contextMenu);
};

const createWindow = (): void => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    height,
    width,
    x: 0,
    y: 0,
    alwaysOnTop: true,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: true,
    resizable: false,

    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: true,
      nodeIntegration: true,
      contextIsolation: false,
      webgl: true,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.moveTop();
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.focus();
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', async () => {
  // CSP 설정
  const policy = [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: file:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: file:",
    "connect-src 'self' blob: data: https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com http://localhost:8000 file:"
  ].join("; ");

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy],
      },
    });
  });

  createWindow();
  
  const initialOpacity = store.get('windowOpacity', 1.0);
  mainWindow.setOpacity(initialOpacity);

  createOverlayWindow();
  createTray();

  // --- IPC Handlers for Settings ---
  ipcMain.on('set-window-opacity', (event, opacity: number) => {
    if (mainWindow) {
      mainWindow.setOpacity(opacity);
      store.set('windowOpacity', opacity);
    }
  });

  ipcMain.handle('get-window-opacity', () => {
    return store.get('windowOpacity', 1.0);
  });

  ipcMain.on('set-persona', (event, persona: string) => {
    store.set('persona', persona);
  });

  ipcMain.handle('get-persona', () => {
    return store.get('persona');
  });

  ipcMain.handle('get-llm-settings', () => {
    const storedSettings = store.get('llmSettings');
    return { ...DEFAULT_LLM_SETTINGS, ...storedSettings };
  });

  ipcMain.on('set-llm-settings', (event, settings: LlmSettings) => {
    store.set('llmSettings', settings);
  });

  // Initialize core components
  const eventBus = createEventBus<AppEvents>();
  const triggerEngine = new TriggerEngine();
  const contextStore = new ContextStore();
  const modSettingsManager = new ModSettingsManager(app.getPath('userData'));
  await modSettingsManager.loadSettings();

  eventBus.on('system:mouse-ignore-toggle', (isIgnoring) => {
    if (mainWindow) {
      mainWindow.webContents.send('set-ui-interactive-mode', !isIgnoring);
    }
  });

  const toggleMouseIgnore = () => {
    if (mainWindow) {
      isIgnoringMouseEvents = !isIgnoringMouseEvents;
      mainWindow.setIgnoreMouseEvents(isIgnoringMouseEvents, { forward: isIgnoringMouseEvents });
      if (!isIgnoringMouseEvents) {
        mainWindow.focus();
      }
      contextStore.set('system:isIgnoringMouseEvents', isIgnoringMouseEvents);
      eventBus.emit('system:mouse-ignore-toggle', isIgnoringMouseEvents);
    }
  };

  globalShortcut.register('CommandOrControl+Shift+T', () => {
    toggleOverlayWindow();
  });

  globalShortcut.register('CommandOrControl+Shift+O', toggleMouseIgnore);

  ipcMain.on('toggle-mouse-ignore', toggleMouseIgnore);

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed() && isIgnoringMouseEvents) {
      mainWindow.hide();
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  const modLoader = new ModLoader(
    app.getPath('userData'),
    app.getAppPath(),
    app.isPackaged,
    eventBus,
    triggerEngine,
    contextStore,
    modSettingsManager,
    (channel: string, ...args: any[]) => {
      const targetWindow = overlayWindow?.isVisible() ? overlayWindow : mainWindow;
      targetWindow?.webContents.send(channel, ...args);
    },
    ipcMain
  );
  modLoader.loadMods();

  // ... (rest of the IPC handlers remain the same)
  ipcMain.handle('play-animation', async (event, animationName: string, loop: boolean, crossFadeDuration: number) => {
    if (overlayWindow) {
      overlayWindow.webContents.send('play-animation-in-renderer', animationName, loop, crossFadeDuration);
    }
  });

  ipcMain.handle('show-message', async (event, message: string, duration: number) => {
    if (overlayWindow) {
      overlayWindow.webContents.send('show-message-in-renderer', message, duration);
    }
  });

  ipcMain.handle('set-expression', async (event, expressionName: string, weight: number, duration: number) => {
    if (overlayWindow) {
      overlayWindow.webContents.send('set-expression-in-renderer', expressionName, weight, duration);
    }
  });

  ipcMain.handle('set-pose', async (event, poseName: string) => {
    if (overlayWindow) {
      overlayWindow.webContents.send('set-pose-in-renderer', poseName);
    }
  });

  ipcMain.handle('look-at', async (event, target: 'camera' | [number, number, number] | null) => {
    if (overlayWindow) {
      overlayWindow.webContents.send('look-at-in-renderer', target);
    }
  });

  ipcMain.handle('list-directory', async (event, dirPath: string) => {
    try {
      const fullPath = path.join(assetsRoot, dirPath);
      const dirents = await fs.promises.readdir(fullPath, { withFileTypes: true });
      const files = dirents.filter(dirent => dirent.isFile()).map(dirent => dirent.name);
      const directories = dirents.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
      return { files, directories };
    } catch (error) {
      console.error(`Failed to list directory ${dirPath}:`, error);
      return { files: [], directories: [], error: error.message };
    }
  });

  ipcMain.handle('save-vrma-pose', async (event, vrmaData: ArrayBuffer) => {
    if (mainWindow) mainWindow.setAlwaysOnTop(false);
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save VRMA Pose',
        defaultPath: path.join(assetsRoot, 'Pose', `pose_${Date.now()}.vrma`),
        filters: [
          { name: 'VRM Animation', extensions: ['vrma'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (canceled || !filePath) {
        return { success: false, message: 'Save operation canceled.' };
      }

      const buffer = Buffer.from(vrmaData);
      await fs.promises.writeFile(filePath, buffer);
      return { success: true, message: `VRMA pose saved to ${filePath}` };
    } catch (error) {
      console.error('Failed to save VRMA pose:', error);
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to save VRMA pose: ${message}` };
    } finally {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }
  });

  ipcMain.handle('open-vrm-file', async () => {
    if (mainWindow) mainWindow.setAlwaysOnTop(false);
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Open VRM Model',
        defaultPath: path.join(assetsRoot, 'VRM'),
        filters: [
          { name: 'VRM Models', extensions: ['vrm'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (canceled || filePaths.length === 0) {
        return null;
      }

      return filePaths[0];
    } finally {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }
  });

  ipcMain.handle('open-vrma-file', async () => {
    if (mainWindow) mainWindow.setAlwaysOnTop(false);
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Open VRMA Pose',
        defaultPath: path.join(assetsRoot, 'Pose'),
        filters: [
          { name: 'VRM Animation', extensions: ['vrma'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (canceled || filePaths.length === 0) {
        return null;
      }

      return filePaths[0];
    } finally {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }
  });

  ipcMain.handle('open-persona-file', async () => {
    if (mainWindow) mainWindow.setAlwaysOnTop(false);
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Open Persona File',
        defaultPath: path.join(assetsRoot, 'Persona'),
        properties: ['openFile'],
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (canceled || filePaths.length === 0) {
        return null;
      }

      const personaContent = await fs.promises.readFile(filePaths[0], 'utf8');
      return personaContent;
    } catch (error) {
      console.error('Failed to read persona file:', error);
      return null;
    } finally {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }
  });

  ipcMain.handle('read-asset-file', async (event, filePath: string) => {
    try {
      const fullPath = path.join(assetsRoot, filePath);
      if (!fullPath.startsWith(assetsRoot)) {
        throw new Error('Attempted to read file outside the assets directory.');
      }
      const data = await fs.promises.readFile(fullPath);
      return data.buffer;
    } catch (error) {
      console.error(`Failed to read asset file ${filePath}:`, error);
      return { error: error.message };
    }
  });

  ipcMain.handle('read-absolute-file', async (event, filePath: string) => {
    try {
      if (!path.isAbsolute(filePath)) {
        throw new Error('Path must be absolute.');
      }
      const data = await fs.promises.readFile(filePath);
      return data.buffer;
    } catch (error) {
      console.error(`Failed to read absolute file ${filePath}:`, error);
      return { error: error.message };
    }
  });

  ipcMain.handle('save-persona-to-file', async (event, persona: string) => {
    if (mainWindow) mainWindow.setAlwaysOnTop(false);
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Persona',
        defaultPath: path.join(assetsRoot, 'Persona', 'persona.txt'),
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (canceled || !filePath) {
        return { success: false, message: 'Save operation canceled.' };
      }

      await fs.promises.writeFile(filePath, persona, 'utf8');
      return { success: true, message: `Persona saved to ${filePath}` };
    } catch (error) {
      console.error('Failed to save persona:', error);
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to save persona: ${message}` };
    } finally {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }
  });

  ipcMain.on('quit-app', () => {
    app.quit();
  });

  ipcMain.on('context:set', (event, key: string, value: any) => {
    contextStore.set(key, value);
  });

  ipcMain.handle('context:get', (event, key: string) => {
    return contextStore.get(key);
  });

  ipcMain.handle('get-mod-settings', () => {
    return modSettingsManager.getSettings();
  });

  ipcMain.handle('set-mod-enabled', async (event, modName: string, isEnabled: boolean) => {
    await modSettingsManager.setModEnabled(modName, isEnabled);
    return { success: true };
  });

  ipcMain.handle('get-all-mods', async () => {
    const modsDir = app.isPackaged 
      ? path.join(app.getPath('userData'), 'mods') 
      : path.join(app.getAppPath(), 'userdata', 'mods');
    
    try {
      const modFolders = await fs.promises.readdir(modsDir, { withFileTypes: true });
      const modDetails = [];

      for (const dirent of modFolders) {
        if (dirent.isDirectory()) {
          const modPath = path.join(modsDir, dirent.name);
          const manifestPath = path.join(modPath, 'mod.json');
          try {
            const manifestContent = await fs.promises.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            if (manifest.name) {
              modDetails.push({
                name: manifest.name,
                version: manifest.version || 'N/A',
                path: modPath,
              });
            }
          } catch (e) {
            // ignore folders without valid mod.json
          }
        }
      }
      return modDetails;
    } catch (error) {
      console.error('[IPC] Failed to get all mods:', error);
      return [];
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
