// src/core/mod-loader.test.ts

import { ModLoader } from './mod-loader';
import { IpcMain } from 'electron';

// --- Mocks ---
jest.mock('fs/promises');

// path 모듈의 실제 구현 일부를 사용하고 일부만 모킹합니다.
const path = jest.requireActual('path');
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
}));

// Mock dependencies
const mockEventBus = {} as any;
const mockTriggerEngine = { registerTrigger: jest.fn() } as any;
const mockContextStore = { get: jest.fn(), set: jest.fn(), getAll: jest.fn() } as any;
const mockModSettingsManager = { isModEnabled: jest.fn().mockReturnValue(true) } as any;
const mockSendToRenderer = jest.fn();
const mockIpcMain = { emit: jest.fn() } as unknown as IpcMain;
const mockGetAvailableActions = jest.fn().mockReturnValue([]);

// Mock Mod's default export
const mockModFunction = jest.fn();

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
      mockTriggerEngine,
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
    expect(fs.mkdir).toHaveBeenCalledWith('app_path/userdata/mods', { recursive: true });
  });

  test('should load a valid mod and call its default function', async () => {
    // 파일 시스템 모킹
    fs.readdir.mockResolvedValue([{ name: 'my-mod', isDirectory: () => true }]);
    fs.readFile.mockResolvedValue(JSON.stringify({
      name: 'Test Mod',
      version: '1.0.0',
      entry: 'index.js',
    }));

    // eval('require') 모킹
    const originalEval = global.eval;
    global.eval = jest.fn().mockReturnValue({ default: mockModFunction });

    await modLoader.loadMods();

    // 모드가 로드되고, default 함수가 PluginContext와 함께 호출되었는지 확인
    expect(mockModFunction).toHaveBeenCalledTimes(1);
    expect(mockModFunction).toHaveBeenCalledWith(expect.objectContaining({
      eventBus: mockEventBus,
      actions: expect.any(Object),
    }));

    global.eval = originalEval; // eval 복원
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
    jest.spyOn(console, 'error');

    await modLoader.loadMods();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ModLoader] Invalid mod.json'),
      expect.anything()
    );
    expect(mockModFunction).not.toHaveBeenCalled();
  });
});
