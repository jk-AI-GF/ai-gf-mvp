// src/plugins/plugin-manager.test.ts

import { PluginManager, IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';
import eventBus from '../core/event-bus';

// 모의 플러그인 클래스
class MockPlugin implements IPlugin {
  name = 'mock-plugin';
  enabled = true; // 기본값을 true로 변경하여 등록 시 활성화 테스트
  runInEditMode = false;

  setup = jest.fn();
  onEnable = jest.fn();
  onDisable = jest.fn();
  update = jest.fn();

  constructor(name = 'mock-plugin', runInEditMode = false) {
    this.name = name;
    this.runInEditMode = runInEditMode;
  }
}

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockContext: PluginContext;

  beforeEach(() => {
    // plugin-api/plugin-context.ts의 실제 정의와 일치하도록 모킹
    mockContext = {
      eventBus: eventBus,
      registerTrigger: jest.fn(),
      actions: {} as any,
      system: {} as any,
      get: jest.fn(),
      set: jest.fn(),
      getAll: jest.fn(),
      characterState: { curiosity: 0 },
      vrmManager: undefined,
    };
    pluginManager = new PluginManager(mockContext);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should register a plugin, call setup, and enable it', () => {
    const plugin = new MockPlugin();
    pluginManager.register(plugin);

    expect(plugin.setup).toHaveBeenCalledWith(mockContext);
    expect(plugin.setup).toHaveBeenCalledTimes(1);
    expect(plugin.onEnable).toHaveBeenCalledTimes(1);
    expect(plugin.enabled).toBe(true);
  });

  test('should call update on enabled plugins', () => {
    const plugin = new MockPlugin();
    pluginManager.register(plugin);
    pluginManager.update(0.016, {} as any);
    expect(plugin.update).toHaveBeenCalledTimes(1);
  });

  test('should not call update on disabled plugins', () => {
    const plugin = new MockPlugin();
    pluginManager.register(plugin);
    pluginManager.disable(plugin.name);
    pluginManager.update(0.016, {} as any);
    expect(plugin.update).not.toHaveBeenCalled();
  });

  describe('setEditMode', () => {
    let plugin: MockPlugin;
    let editModePlugin: MockPlugin;

    beforeEach(() => {
      plugin = new MockPlugin('normal-plugin', false);
      editModePlugin = new MockPlugin('edit-mode-plugin', true);
      pluginManager.register(plugin);
      pluginManager.register(editModePlugin);
    });

    test('should disable normal plugins when entering edit mode', () => {
      pluginManager.setEditMode(true);
      expect(plugin.onDisable).toHaveBeenCalledTimes(1);
      expect(plugin.enabled).toBe(false);
      expect(editModePlugin.onDisable).not.toHaveBeenCalled();
      expect(editModePlugin.enabled).toBe(true);
    });

    test('should re-enable normal plugins when exiting edit mode', () => {
      pluginManager.setEditMode(true); // 진입
      plugin.onEnable.mockClear(); // 호출 카운트 초기화
      
      pluginManager.setEditMode(false); // 종료
      expect(plugin.onEnable).toHaveBeenCalledTimes(1);
      expect(plugin.enabled).toBe(true);
    });

    test('should not change state if edit mode is set to the same value', () => {
      pluginManager.setEditMode(true);
      expect(plugin.onDisable).toHaveBeenCalledTimes(1);
      pluginManager.setEditMode(true);
      expect(plugin.onDisable).toHaveBeenCalledTimes(1);
    });
  });
});
