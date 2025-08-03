import { app, BrowserWindow, Tray, Menu, globalShortcut, dialog, session, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import fsp from 'fs/promises';
import Store from 'electron-store';
import { ModLoader } from '../core/mod-loader';
import { createEventBus, AppEvents } from '../core/event-bus';
import { TriggerEngine } from '../core/trigger-engine';
import { ContextStore } from '../core/context-store';
import { ModSettingsManager } from '../core/mod-settings-manager';
import { LlmSettings, DEFAULT_LLM_SETTINGS } from '../core/llm-settings';
import { getAssetsPath, getUserDataPath, resolveAssetsPath, resolveUserDataPath } from './path-utils';
import { CustomTrigger } from '../core/custom-trigger-manager';
import { ActionDefinition } from '../plugin-api/actions';
import { ActionRegistry } from '../core/action-registry'; // 추가

// Define the schema for electron-store
interface StoreSchema {
  windowOpacity: number;
  persona: string;
  llmSettings: LlmSettings;
  mouseIgnoreShortcut: string;
  activeSequences: string[];
  // customTriggers is now managed as individual files.
}

// Store 인스턴스 생성
const store = new Store<Omit<StoreSchema, 'customTriggers'>>({
  defaults: {
    windowOpacity: 1.0,
    persona: '당신은 친절하고 상냥한 AI 여자친구입니다. 항상 사용자에게 긍정적이고 다정한 태도로 대화에 임해주세요.',
    llmSettings: DEFAULT_LLM_SETTINGS,
    mouseIgnoreShortcut: 'CommandOrControl+Shift+O',
    activeSequences: [], // 활성 시퀀스 목록 추가
  }
});

process.on('uncaughtException', (error) => {
  const message = error.stack || error.message || 'Unknown error';
  dialog.showErrorBox('A JavaScript error occurred in the main process', message);
  app.quit();
});

// --- Active Sequences Store ---
ipcMain.handle('get-active-sequences', () => {
  return store.get('activeSequences', []);
});

ipcMain.on('set-active-sequences', (event, activeSequences: string[]) => {
  store.set('activeSequences', activeSequences);
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
let availableActionsCache: ActionDefinition[] = [];

// --- Path and Resource IPC Handlers ---
ipcMain.handle('get-path', async (event, pathName: 'assets' | 'userData') => {
  switch (pathName) {
    case 'assets':
      return getAssetsPath();
    case 'userData':
      return getUserDataPath();
    default:
      throw new Error(`Unknown path name: ${pathName}`);
  }
});

ipcMain.handle('resolve-path', async (event, pathName: 'assets' | 'userData', subpath: string) => {
  switch (pathName) {
    case 'assets':
      return resolveAssetsPath(subpath);
    case 'userData':
      return resolveUserDataPath(subpath);
    default:
      throw new Error(`Unknown path name: ${pathName}`);
  }
});

ipcMain.handle('fs:exists', async (event, filePath: string) => {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('list-directory', async (event, dirPath: string, basePath: 'assets' | 'userData') => {
  try {
    let fullPath: string;
    let rootPath: string;

    if (basePath === 'userData') {
      rootPath = getUserDataPath();
      fullPath = resolveUserDataPath(dirPath);
    } else { // 'assets'
      rootPath = getAssetsPath();
      fullPath = resolveAssetsPath(dirPath);
    }

    // Security check
    if (!fullPath.startsWith(rootPath)) {
      throw new Error(`Security violation: Attempted to access directory outside of the allowed path: ${dirPath}`);
    }

    const files = await fsp.readdir(fullPath);
    return { files }; // Return in the expected object format
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { files: [] }; // Directory not found is not a critical error, return empty list
    }
    console.error(`[IPC:list-directory] Error listing directory ${dirPath}:`, error);
    return { error: error.message }; // Return error in the expected object format
  }
});


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
  const iconPath = resolveAssetsPath('icon.png');
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

  // Ensure userdata directories exist on startup
  try {
    const userDataPath = getUserDataPath();
    const requiredDirs = ['vrm', 'poses', 'mods', 'animations', 'persona', 'triggers', 'sequences'];
    for (const dir of requiredDirs) {
      fs.mkdirSync(path.join(userDataPath, dir), { recursive: true });
    }
    console.log('User data directories verified/created successfully.');
  } catch (error) {
    console.error('Failed to create user data directories:', error);
  }
  
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

  // --- Custom Triggers (File-based) ---
  ipcMain.handle('get-custom-triggers', async () => {
    const triggersDir = resolveUserDataPath('triggers');
    try {
      const files = await fsp.readdir(triggersDir);
      const triggerPromises = files
        .filter(file => file.endsWith('.json'))
        .map(async file => {
          try {
            const filePath = path.join(triggersDir, file);
            const content = await fsp.readFile(filePath, 'utf-8');
            return JSON.parse(content);
          } catch (err) {
            console.error(`Failed to read or parse trigger file: ${file}`, err);
            return null;
          }
        });
      const triggers = (await Promise.all(triggerPromises)).filter(Boolean);
      return triggers;
    } catch (error) {
      console.error('Failed to get custom triggers:', error);
      // If the directory doesn't exist, return an empty array
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  });

  ipcMain.handle('save-custom-trigger', async (event, trigger: CustomTrigger) => {
    const triggersDir = resolveUserDataPath('triggers');
    const filePath = path.join(triggersDir, `${trigger.id}.json`);
    try {
      await fsp.writeFile(filePath, JSON.stringify(trigger, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      console.error(`Failed to save trigger ${trigger.id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-custom-trigger', async (event, triggerId: string) => {
    const triggersDir = resolveUserDataPath('triggers');
    const filePath = path.join(triggersDir, `${triggerId}.json`);
    try {
      await fsp.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete trigger ${triggerId}:`, error);
      // If the file doesn't exist, it's not a critical error
      if (error.code === 'ENOENT') {
        return { success: true, message: 'File not found, considered deleted.' };
      }
      return { success: false, error: error.message };
    }
  });

  // --- Sequences ---
  ipcMain.handle('get-sequences', async () => {
    const sequencesDir = resolveUserDataPath('sequences');
    try {
      const files = await fsp.readdir(sequencesDir);
      // .json 파일만 필터링하고, 전체 경로 대신 파일 이름만 반환합니다.
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      console.error('Failed to get sequences:', error);
      if (error.code === 'ENOENT') {
        return []; // 디렉토리가 없으면 빈 배열 반환
      }
      throw error;
    }
  });

  ipcMain.handle('delete-sequence', async (event, sequenceFile: string) => {
    const sequencesDir = resolveUserDataPath('sequences');
    const filePath = path.join(sequencesDir, sequenceFile);
    
    // Security check
    if (path.dirname(filePath) !== sequencesDir) {
      return { success: false, error: 'Security violation: Invalid file path.' };
    }

    try {
      await fsp.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete sequence ${sequenceFile}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-sequence', async (event, sequenceData: string) => {
    if (mainWindow) mainWindow.setAlwaysOnTop(false);
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '시퀀스 저장',
        defaultPath: path.join(getUserDataPath(), 'sequences', `sequence-${Date.now()}.json`),
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      await fsp.writeFile(filePath, sequenceData, 'utf-8');
      return { success: true, filePath };
    } catch (error) {
      console.error('Failed to save sequence:', error);
      return { success: false, error: error.message };
    } finally {
       if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }
  });

  ipcMain.handle('load-sequence', async () => {
    if (mainWindow) mainWindow.setAlwaysOnTop(false);
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '시퀀스 불러오기',
        defaultPath: path.join(getUserDataPath(), 'sequences'),
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = filePaths[0];
      const data = await fsp.readFile(filePath, 'utf-8');
      return { success: true, data, filePath };
    } catch (error) {
      console.error('Failed to load sequence:', error);
      return { success: false, error: error.message };
    } finally {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }
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

  let currentShortcut = store.get('mouseIgnoreShortcut');

  const registerMouseIgnoreShortcut = () => {
    if (currentShortcut) {
      try {
        globalShortcut.register(currentShortcut, toggleMouseIgnore);
        console.log(`Registered shortcut: ${currentShortcut}`);
      } catch (error) {
        console.error(`Failed to register shortcut "${currentShortcut}":`, error);
      }
    }
  };

  const unregisterMouseIgnoreShortcut = () => {
    if (currentShortcut) {
      globalShortcut.unregister(currentShortcut);
      console.log(`Unregistered shortcut: ${currentShortcut}`);
    }
  };

  registerMouseIgnoreShortcut();

  ipcMain.handle('get-mouse-ignore-shortcut', () => {
    return store.get('mouseIgnoreShortcut');
  });

  ipcMain.on('set-mouse-ignore-shortcut', (event, shortcut: string) => {
    unregisterMouseIgnoreShortcut();
    store.set('mouseIgnoreShortcut', shortcut);
    currentShortcut = shortcut;
    registerMouseIgnoreShortcut();
  });

  globalShortcut.register('CommandOrControl+Shift+T', () => {
    toggleOverlayWindow();
  });

  ipcMain.on('toggle-mouse-ignore', toggleMouseIgnore);

  let modsLoaded = false; // 모드가 로드되었는지 확인하는 플래그

  // 렌더러로부터 액션 명세를 받아 캐시에 저장하고 모드를 로드
  ipcMain.handle('set-action-definitions', (event, actions: ActionDefinition[]) => {
    console.log('[Main] Received action definitions from renderer.');
    availableActionsCache = actions;
    
    if (!modsLoaded) {
      console.log('[Main] Action definitions received, loading mods...');
      modLoader.loadMods();
      modsLoaded = true;
    }
    
    return true;
  });

  // ModLoader로부터의 액션 요청을 렌더러로 전달
  ipcMain.on('proxy-action', (event, actionName: string, args: any[]) => {
    const targetWindow = overlayWindow?.isVisible() ? overlayWindow : mainWindow;
    targetWindow?.webContents.send('execute-action', actionName, args);
  });

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
    ipcMain,
    () => availableActionsCache // Pass a function to get the cache
  );
  // 앱 시작 시 바로 로드하지 않고, 액션 정의를 받은 후 로드하도록 변경
  // modLoader.loadMods();

  // ... (rest of the IPC handlers remain the same)

  ipcMain.handle('save-vrma-pose', async (event, vrmaData: ArrayBuffer) => {
    if (mainWindow) mainWindow.setAlwaysOnTop(false);
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save VRMA Pose',
        defaultPath: path.join(getUserDataPath(), 'poses', `pose_${Date.now()}.vrma`),
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
        defaultPath: path.join(getUserDataPath(), 'vrm'),
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
        defaultPath: path.join(getUserDataPath(), 'poses'),
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
        defaultPath: path.join(getUserDataPath(), 'persona'),
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
      const fullPath = resolveAssetsPath(filePath);
      if (!fullPath.startsWith(getAssetsPath())) {
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

  ipcMain.handle('readFile', async (event, filePath: string) => {
    try {
      let fullPath = filePath;
      if (!path.isAbsolute(filePath)) {
        // If not absolute, assume it's relative to the assets directory for backward compatibility.
        fullPath = resolveAssetsPath(filePath);
        // Security check
        if (!fullPath.startsWith(getAssetsPath())) {
          throw new Error('Attempted to access file outside the assets directory.');
        }
      }
      const data = await fs.promises.readFile(fullPath);
      return data.buffer;
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      return { error: error.message };
    }
  });

  ipcMain.handle('save-persona-to-file', async (event, persona: string) => {
    if (mainWindow) mainWindow.setAlwaysOnTop(false);
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Persona',
        defaultPath: path.join(getUserDataPath(), 'persona', 'persona.txt'),
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

  ipcMain.handle('context:getAll', (event) => {
    return contextStore.getAll();
  });

  ipcMain.handle('get-mod-settings', () => {
    return modSettingsManager.getSettings();
  });

  ipcMain.handle('set-mod-enabled', async (event, modName: string, isEnabled: boolean) => {
    await modSettingsManager.setModEnabled(modName, isEnabled);
    return { success: true };
  });

  ipcMain.handle('get-all-mods', async () => {
    const modsDir = resolveUserDataPath('mods');
    
    try {
      // Ensure the mods directory exists
      await fs.promises.mkdir(modsDir, { recursive: true });

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
