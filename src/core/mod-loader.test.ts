// src/core/mod-loader.test.ts

import { ModLoader } from './mod-loader';
import { IpcMain } from 'electron';

// --- Mocks ---
jest.mock('fs/promises');
jest.mock('mime', () => ({
  getType: () => 'image/png',
}));



// Mock dependencies
const mockEventBus = {} as any;
const mockContextStore = { get: jest.fn(), set: jest.fn(), getAll: jest.fn() } as any;
const mockModSettingsManager = { isModEnabled: jest.fn().mockReturnValue(true) } as any;
const mockSendToRenderer = jest.fn();
const mockIpcMain = { emit: jest.fn() } as unknown as IpcMain;
const mockGetAvailableActions = jest.fn().mockReturnValue([]);

// Mock Mod's default export
const mockModFunction = jest.fn();

// Mock for __non_webpack_require__ in test environment
const mockRequire = jest.fn().mockReturnValue({ default: mockModFunction });
(global as any).__non_webpack_require__ = mockRequire;

describe('ModLoader', () => {
  let modLoader: ModLoader;
  const fs = require('fs/promises');
  
  beforeEach(() => {
    jest.clearAllMocks();

    modLoader = new ModLoader(
      'userdata',
      'app_path',
      false, // isPackaged
      mockEventBus,
      mockContextStore,
      mockModSettingsManager,
      mockSendToRenderer,
      mockIpcMain,
      mockGetAvailableActions
    );
  });

  test('should create mods directory if it does not exist', async () => {
    fs.readdir.mockRejectedValue(new Error('ENOENT')); // 디렉토리 없음
    await modLoader.loadMods();
    const expectedPath = require('path').join('app_path', 'userdata', 'mods');
    expect(fs.mkdir).toHaveBeenCalledWith(expectedPath, { recursive: true });
  });

  test('should load a valid mod and call its default function', async () => {
    // 파일 시스템 모킹
    fs.readdir.mockResolvedValue([{ name: 'my-mod', isDirectory: () => true }]);
    fs.readFile.mockResolvedValue(JSON.stringify({
      name: 'Test Mod',
      version: '1.0.0',
      entry: 'index.js',
    }));

    await modLoader.loadMods();
  });

  test('should skip disabled mods', async () => {
    mockModSettingsManager.isModEnabled.mockReturnValue(false);
    fs.readdir.mockResolvedValue([{ name: 'my-mod', isDirectory: () => true }]);
    fs.readFile.mockResolvedValue(JSON.stringify({
      name: 'Test Mod',
      version: '1.0.0',
      entry: 'index.js',
    }));

    await modLoader.loadMods();
    expect(mockModFunction).not.toHaveBeenCalled();
  });

  test('should handle invalid mod.json gracefully', async () => {
    fs.readdir.mockResolvedValue([{ name: 'bad-mod', isDirectory: () => true }]);
    fs.readFile.mockResolvedValue(JSON.stringify({})); // 필수 필드 누락
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await modLoader.loadMods();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ModLoader] Invalid mod.json in app_path\\userdata\\mods\\bad-mod. Missing required fields.'
    );
    expect(mockModFunction).not.toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
});
