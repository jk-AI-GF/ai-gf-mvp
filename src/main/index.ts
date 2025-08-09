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
import { ICharacterState } from '../plugin-api/plugin-context';

// Define the schema for electron-store
interface StoreSchema {
  windowOpacity: number;
  persona: string;
  llmSettings: LlmSettings;
  mouseIgnoreShortcut: string;
  activeSequences: string[];
  characterState: Partial<ICharacterState>;
}

const DEFAULT_CHARACTER_STATE: ICharacterState = {
  curiosity: 0.5,
  happiness: 0.5,
  energy: 0.8,
  lastInteractionTimestamp: Date.now(),
};

// Store 인스턴스 생성
const store = new Store<Omit<StoreSchema, 'customTriggers'>>({
  defaults: {
    windowOpacity: 1.0,
    persona: '당신은 친절하고 상냥한 AI 여자친구입니다. 항상 사용자에게 긍정적이고 다정한 태도로 대화에 임해주세요.',
    llmSettings: DEFAULT_LLM_SETTINGS,
    mouseIgnoreShortcut: 'CommandOrControl+Shift+O',
    activeSequences: [],
    characterState: DEFAULT_CHARACTER_STATE,
  }
});

// --- Global Variables ---
let tray: Tray | null = null;
let overlayWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let isIgnoringMouseEvents = false;
let availableActionsCache: ActionDefinition[] = [];
let modLoader: ModLoader;
let modsLoaded = false;
let lastSavedState: Partial<ICharacterState> | null = null;

// --- Early Error Handling ---
process.on('uncaughtException', (error) => {
  const message = error.stack || error.message || 'Unknown error';
  dialog.showErrorBox('A JavaScript error occurred in the main process', message);
  app.quit();
});

// --- Webpack Declarations ---
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_WEBPACK_ENTRY: string;

// --- Squirrel Startup ---
if (require('electron-squirrel-startup')) {
  app.quit();
}

//==============================================================================
// IPC HANDLER REGISTRATION
//==============================================================================

// --- Character State Persistence ---
ipcMain.on('character-state:changed', (event, newState: ICharacterState) => {
  lastSavedState = newState;
  store.set('characterState', newState);
});

// --- Active Sequences Store ---
ipcMain.handle('get-active-sequences', () => {
  return store.get('activeSequences', []);
});
ipcMain.on('set-active-sequences', (event, activeSequences: string[]) => {
  store.set('activeSequences', activeSequences);
});

// --- Path and Resource IPC Handlers ---
ipcMain.handle('get-path', (event, pathName: 'assets' | 'userData') => {
  return pathName === 'assets' ? getAssetsPath() : getUserDataPath();
});
ipcMain.handle('resolve-path', (event, pathName: 'assets' | 'userData', subpath: string) => {
  return pathName === 'assets' ? resolveAssetsPath(subpath) : resolveUserDataPath(subpath);
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
    const rootPath = basePath === 'userData' ? getUserDataPath() : getAssetsPath();
    const fullPath = basePath === 'userData' ? resolveUserDataPath(dirPath) : resolveAssetsPath(dirPath);
    if (!fullPath.startsWith(rootPath)) {
      throw new Error(`Security violation: Attempted to access directory outside of the allowed path: ${dirPath}`);
    }
    const files = await fsp.readdir(fullPath);
    return { files };
  } catch (error) {
    return error.code === 'ENOENT' ? { files: [] } : { error: error.message };
  }
});

// --- Settings IPC Handlers ---
ipcMain.on('set-window-opacity', (event, opacity: number) => {
  if (mainWindow) {
    mainWindow.setOpacity(opacity);
  }
  store.set('windowOpacity', opacity);
});
ipcMain.handle('get-window-opacity', () => store.get('windowOpacity', 1.0));
ipcMain.on('set-persona', (event, persona: string) => store.set('persona', persona));
ipcMain.handle('get-persona', () => store.get('persona'));
ipcMain.handle('get-llm-settings', () => ({ ...DEFAULT_LLM_SETTINGS, ...store.get('llmSettings') }));
ipcMain.on('set-llm-settings', (event, settings: LlmSettings) => store.set('llmSettings', settings));

// --- Custom Triggers (File-based) ---
ipcMain.handle('get-custom-triggers', async () => {
  const triggersDir = resolveUserDataPath('triggers');
  try {
    const files = await fsp.readdir(triggersDir);
    const triggerPromises = files
      .filter(file => file.endsWith('.json'))
      .map(async file => {
        try {
          return JSON.parse(await fsp.readFile(path.join(triggersDir, file), 'utf-8'));
        } catch (err) {
          console.error(`Failed to read or parse trigger file: ${file}`, err);
          return null;
        }
      });
    return (await Promise.all(triggerPromises)).filter(Boolean);
  } catch (error) {
    return error.code === 'ENOENT' ? [] : Promise.reject(error);
  }
});
ipcMain.handle('save-custom-trigger', async (event, trigger: CustomTrigger) => {
  const filePath = path.join(resolveUserDataPath('triggers'), `${trigger.id}.json`);
  try {
    await fsp.writeFile(filePath, JSON.stringify(trigger, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error(`Failed to save trigger ${trigger.id}:`, error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle('delete-custom-trigger', async (event, triggerId: string) => {
  const filePath = path.join(resolveUserDataPath('triggers'), `${triggerId}.json`);
  try {
    await fsp.unlink(filePath);
    return { success: true };
  } catch (error) {
    if (error.code === 'ENOENT') return { success: true };
    console.error(`Failed to delete trigger ${triggerId}:`, error);
    return { success: false, error: error.message };
  }
});

// --- Sequences ---
ipcMain.handle('get-sequences', async () => {
  const sequencesDir = resolveUserDataPath('sequences');
  try {
    return (await fsp.readdir(sequencesDir)).filter(file => file.endsWith('.json'));
  } catch (error) {
    return error.code === 'ENOENT' ? [] : Promise.reject(error);
  }
});
ipcMain.handle('get-poses', async () => {
  try {
    const userPosesDir = resolveUserDataPath('poses');
    const assetPosesDir = resolveAssetsPath('Pose');

    const userPosesPromise = fsp.readdir(userPosesDir).catch((): string[] => []);
    const assetPosesPromise = fsp.readdir(assetPosesDir).catch((): string[] => []);

    const [userFiles, assetFiles] = await Promise.all([userPosesPromise, assetPosesPromise]);

    const combinedFiles = new Set([...userFiles, ...assetFiles]);
    return Array.from(combinedFiles).filter(file => file.toLowerCase().endsWith('.vrma'));
  } catch (error) {
    console.error('Failed to get poses:', error);
    return [];
  }
});
ipcMain.handle('delete-sequence', async (event, sequenceFile: string) => {
  const sequencesDir = resolveUserDataPath('sequences');
  const filePath = path.join(sequencesDir, sequenceFile);
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
ipcMain.handle('save-sequence-to-file', async (event, fileName: string, sequenceData: string) => {
  const sequencesDir = resolveUserDataPath('sequences');
  const filePath = path.join(sequencesDir, fileName);
  if (path.dirname(filePath) !== sequencesDir) {
    return { success: false, error: 'Security violation: Invalid file path.' };
  }
  try {
    await fsp.writeFile(filePath, sequenceData, 'utf-8');
    return { success: true, filePath };
  } catch (error) {
    console.error(`Failed to save sequence to ${fileName}:`, error);
    return { success: false, error: error.message };
  }
});

// --- File Dialogs ---
const handleFileDialog = async (
  operation: 'save' | 'open',
  options: Electron.SaveDialogOptions | Electron.OpenDialogOptions,
  postAction?: (filePath: string) => Promise<any>
) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(false);
  try {
    let filePath: string | undefined;
    let canceled = false;

    if (operation === 'save') {
      const result = await dialog.showSaveDialog(options as Electron.SaveDialogOptions);
      filePath = result.filePath;
      canceled = result.canceled;
    } else {
      const result = await dialog.showOpenDialog(options as Electron.OpenDialogOptions);
      if (result.filePaths && result.filePaths.length > 0) {
        filePath = result.filePaths[0];
      }
      canceled = result.canceled;
    }

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    if (postAction) {
      return await postAction(filePath);
    }
    
    return { success: true, filePath };
  } catch (error) {
    console.error(`File dialog operation failed:`, error);
    return { success: false, error: error.message };
  } finally {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }
};

ipcMain.handle('save-sequence', (event, sequenceData: string) => handleFileDialog(
  'save',
  { title: '시퀀스 저장', defaultPath: path.join(getUserDataPath(), 'sequences', `sequence-${Date.now()}.json`), filters: [{ name: 'JSON Files', extensions: ['json'] }] },
  async (filePath) => {
    await fsp.writeFile(filePath, sequenceData, 'utf-8');
    return { success: true, filePath };
  }
));
ipcMain.handle('load-sequence', () => handleFileDialog(
  'open',
  { title: '시퀀스 불러오기', defaultPath: path.join(getUserDataPath(), 'sequences'), properties: ['openFile'], filters: [{ name: 'JSON Files', extensions: ['json'] }] },
  async (filePath) => {
    const data = await fsp.readFile(filePath, 'utf-8');
    return { success: true, data, filePath };
  }
));
ipcMain.handle('save-vrma-pose', (event, vrmaData: ArrayBuffer) => handleFileDialog(
  'save',
  { title: 'Save VRMA Pose', defaultPath: path.join(getUserDataPath(), 'poses', `pose_${Date.now()}.vrma`), filters: [{ name: 'VRM Animation', extensions: ['vrma'] }] },
  async (filePath) => {
    await fsp.writeFile(filePath, Buffer.from(vrmaData));
    return { success: true, message: `VRMA pose saved to ${filePath}` };
  }
));
ipcMain.handle('open-vrm-file', () => handleFileDialog(
  'open',
  { title: 'Open VRM Model', defaultPath: path.join(getUserDataPath(), 'vrm'), properties: ['openFile'], filters: [{ name: 'VRM Models', extensions: ['vrm'] }] },
  (filePath) => Promise.resolve(filePath)
).then(result => (result && (result as any).success === false) ? null : result));
ipcMain.handle('open-vrma-file', () => handleFileDialog(
  'open',
  { title: 'Open VRMA Pose', defaultPath: path.join(getUserDataPath(), 'poses'), properties: ['openFile'], filters: [{ name: 'VRM Animation', extensions: ['vrma'] }] },
  (filePath) => Promise.resolve(filePath)
).then(result => (result && (result as any).success === false) ? null : result));
ipcMain.handle('open-persona-file', () => handleFileDialog(
  'open',
  { title: 'Open Persona File', defaultPath: path.join(getUserDataPath(), 'persona'), properties: ['openFile'], filters: [{ name: 'Text Files', extensions: ['txt'] }] },
  (filePath) => fsp.readFile(filePath, 'utf8')
).then(result => (result && (result as any).success === false) ? null : result));
ipcMain.handle('save-persona-to-file', (event, persona: string) => handleFileDialog(
  'save',
  { title: 'Save Persona', defaultPath: path.join(getUserDataPath(), 'persona', 'persona.txt'), filters: [{ name: 'Text Files', extensions: ['txt'] }] },
  async (filePath) => {
    await fsp.writeFile(filePath, persona, 'utf8');
    return { success: true, message: `Persona saved to ${filePath}` };
  }
));

// --- File System Access ---
ipcMain.handle('read-asset-file', async (event, filePath: string) => {
  const fullPath = resolveAssetsPath(filePath);
  if (!fullPath.startsWith(getAssetsPath())) throw new Error('Attempted to read file outside the assets directory.');
  return fsp.readFile(fullPath).then(data => data.buffer).catch(err => ({ error: err.message }));
});
ipcMain.handle('read-absolute-file', async (event, filePath: string) => {
  if (!path.isAbsolute(filePath)) throw new Error('Path must be absolute.');
  return fsp.readFile(filePath).then(data => data.buffer).catch(err => ({ error: err.message }));
});
ipcMain.handle('readFile', async (event, filePath: string) => {
  let fullPath = filePath;
  if (!path.isAbsolute(filePath)) {
    fullPath = resolveAssetsPath(filePath);
    if (!fullPath.startsWith(getAssetsPath())) throw new Error('Attempted to access file outside the assets directory.');
  }
  return fsp.readFile(fullPath).then(data => data.buffer).catch(err => ({ error: err.message }));
});

// --- App Control ---
ipcMain.on('quit-app', () => {
  BrowserWindow.getAllWindows().forEach((win) => win.destroy());
  app.quit();
});
ipcMain.on('toggle-mouse-ignore', () => {
  if (mainWindow) {
    isIgnoringMouseEvents = !isIgnoringMouseEvents;
    mainWindow.setIgnoreMouseEvents(isIgnoringMouseEvents, { forward: isIgnoringMouseEvents });
    if (!isIgnoringMouseEvents) mainWindow.focus();
  }
});

// --- Modding ---
ipcMain.handle('set-action-definitions', (event, actions: ActionDefinition[]) => {
  console.log('[Main] Received action definitions from renderer.');
  availableActionsCache = actions;
  if (!modsLoaded && modLoader) {
    console.log('[Main] Action definitions received, loading mods...');
    modLoader.loadMods();
    modsLoaded = true;
  }
  return true;
});
ipcMain.on('proxy-action', (event, actionName: string, args: any[]) => {
  const targetWindow = overlayWindow?.isVisible() ? overlayWindow : mainWindow;
  targetWindow?.webContents.send('execute-action', actionName, args);
});
ipcMain.on('context:set', (event, key: string, value: any) => {});
ipcMain.handle('context:get', (event, key: string) => {});
ipcMain.handle('context:getAll', (event) => {});
ipcMain.handle('get-mod-settings', async () => {});
ipcMain.handle('set-mod-enabled', async (event, modName: string, isEnabled: boolean) => {
  return { success: true };
});
ipcMain.handle('get-all-mods', async () => {
  const modsDir = resolveUserDataPath('mods');
  try {
    await fs.promises.mkdir(modsDir, { recursive: true });
    const modFolders = await fs.promises.readdir(modsDir, { withFileTypes: true });
    return Promise.all(modFolders
      .filter(dirent => dirent.isDirectory())
      .map(async (dirent) => {
        const manifestPath = path.join(modsDir, dirent.name, 'mod.json');
        try {
          const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf-8'));
          return { name: manifest.name, version: manifest.version || 'N/A', path: path.join(modsDir, dirent.name) };
        } catch {
          return null;
        }
      })
    ).then(mods => mods.filter(Boolean));
  } catch (error) {
    console.error('[IPC] Failed to get all mods:', error);
    return [];
  }
});

//==============================================================================
// APPLICATION LIFECYCLE
//==============================================================================

const createWindow = (): void => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    height, width, x: 0, y: 0,
    alwaysOnTop: true,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: true,
    resizable: false,
    fullscreen: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: true,
      nodeIntegration: true,
      contextIsolation: false,
      webgl: true,
    },
  });
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.on('closed', () => mainWindow = null);
  mainWindow.webContents.on('did-finish-load', () => mainWindow.focus());
  if (!app.isPackaged || process.argv.includes('--dev-tools')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed() && isIgnoringMouseEvents) {
      mainWindow.hide();
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });
};

const createOverlayWindow = (): void => {
  const { width, height } = screen.getPrimaryDisplay().size;
  overlayWindow = new BrowserWindow({
    height, width, x: 0, y: 0,
    skipTaskbar: true,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: true,
      nodeIntegration: true,
      contextIsolation: false,
      webgl: true,
    },
  });
  overlayWindow.loadURL(OVERLAY_WINDOW_WEBPACK_ENTRY);
  overlayWindow.on('closed', () => overlayWindow = null);
};

const toggleOverlayWindow = (): void => {
  if (!overlayWindow) return;
  if (overlayWindow.isVisible()) {
    overlayWindow.hide();
    mainWindow?.show();
  } else {
    overlayWindow.show();
    mainWindow?.hide();
  }
};

const createTray = (): void => {
  const iconPath = resolveAssetsPath('icon.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Toggle Overlay', click: toggleOverlayWindow },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('AI-GF MVP');
  tray.setContextMenu(contextMenu);
};

app.on('ready', async () => {
  // CSP
  const policy = "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: file:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: file:; connect-src 'self' blob: data: https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com http://localhost:8000 file:";
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [policy] } });
  });

  // Create windows and tray
  createWindow();
  createOverlayWindow();
  createTray();

  // Set initial opacity
  mainWindow.setOpacity(store.get('windowOpacity', 1.0));

  // Send the loaded character state to the renderer once it's ready
  const sendInitialState = () => {
    // Get the saved state, which might be partial or from an old version.
    const savedState = store.get('characterState');

    // Merge the saved state with the defaults. Properties in `savedState` will overwrite defaults.
    // This ensures the object sent to the renderer is always complete.
    const mergedState = { ...DEFAULT_CHARACTER_STATE, ...savedState };

    lastSavedState = mergedState;
    
    // Write the cleaned-up state back to the store to fix the file for the next startup.
    store.set('characterState', mergedState);

    // Send the complete, merged state to the renderer.
    mainWindow.webContents.send('character-state:load', mergedState);
    console.log('[Main] Initial character state (merged and repaired) sent to renderer.');
  };

  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', sendInitialState);
  } else {
    sendInitialState();
  }

  // Ensure userdata directories exist
  try {
    const requiredDirs = ['vrm', 'poses', 'mods', 'animations', 'persona', 'triggers', 'sequences'];
    await Promise.all(requiredDirs.map(dir => fsp.mkdir(path.join(getUserDataPath(), dir), { recursive: true })));
    console.log('User data directories verified/created successfully.');
  } catch (error) {
    console.error('Failed to create user data directories:', error);
  }

  // Initialize core components
  const eventBus = createEventBus<AppEvents>();
  const triggerEngine = new TriggerEngine();
  const contextStore = new ContextStore();
  const modSettingsManager = new ModSettingsManager(app.getPath('userData'));
  await modSettingsManager.loadSettings();

  modLoader = new ModLoader(
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
    () => availableActionsCache
  );

  // Shortcuts
  const toggleMouseIgnore = () => {
    if (mainWindow) {
      isIgnoringMouseEvents = !isIgnoringMouseEvents;
      mainWindow.setIgnoreMouseEvents(isIgnoringMouseEvents, { forward: isIgnoringMouseEvents });
      if (!isIgnoringMouseEvents) mainWindow.focus();
      
      mainWindow.webContents.send('set-ui-interactive-mode', !isIgnoringMouseEvents);
    }
  };

  let currentShortcut = store.get('mouseIgnoreShortcut');
  const registerMouseIgnoreShortcut = () => {
    if (currentShortcut) {
      try {
        globalShortcut.register(currentShortcut, toggleMouseIgnore);
      } catch (error) {
        console.error(`Failed to register shortcut "${currentShortcut}":`, error);
      }
    }
  };
  const unregisterMouseIgnoreShortcut = () => {
    if (currentShortcut) globalShortcut.unregister(currentShortcut);
  };

  registerMouseIgnoreShortcut();

  ipcMain.handle('get-mouse-ignore-shortcut', () => store.get('mouseIgnoreShortcut'));
  ipcMain.on('set-mouse-ignore-shortcut', (event, shortcut: string) => {
    unregisterMouseIgnoreShortcut();
    store.set('mouseIgnoreShortcut', shortcut);
    currentShortcut = shortcut;
    registerMouseIgnoreShortcut();
  });

  globalShortcut.register('CommandOrControl+Shift+T', toggleOverlayWindow);
});

app.on('will-quit', () => {
  if (lastSavedState) {
    store.set('characterState', lastSavedState);
    console.log('[Main] Final character state saved on quit.');
  }
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
