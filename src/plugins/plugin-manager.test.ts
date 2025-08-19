// src/plugins/plugin-manager.test.ts

import { PluginManager, IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';
import eventBus from '../core/event-bus';

// 모의 플러그인 클래스
class MockPlugin implements IPlugin {
  name = 'mock-plugin';
  enabled = true; // 기본값을 true로 변경하여 등록 시 활성화 테스트
  runInVrmMode = false;

  setup = jest.fn();
  onEnable = jest.fn();
  onDisable = jest.fn();
  update = jest.fn();

  constructor(name = 'mock-plugin', runInVrmMode = false) {
    this.name = name;
    this.runInVrmMode = runInVrmMode;
  }
}

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockContext: PluginContext;

  beforeEach(() => {
    // plugin-api/plugin-context.ts의 실제 정의와 일치하도록 모킹
    mockContext = {
      eventBus: eventBus,
      actions: {} as any,
      system: {} as any,
      get: jest.fn(),
      set: jest.fn(),
      getAll: jest.fn(),
      characterState: { characterName: '', userName: '', curiosity: 0, happiness: 0, energy: 0, lastInteractionTimestamp: 0 },
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

  describe('setVrmMode', () => {
    let plugin: MockPlugin;
    let vrmModePlugin: MockPlugin;

    beforeEach(() => {
      plugin = new MockPlugin('normal-plugin', false);
      vrmModePlugin = new MockPlugin('vrm-mode-plugin', true);
      pluginManager.register(plugin);
      pluginManager.register(vrmModePlugin);
    });

    test('should disable normal plugins when entering vrm mode', () => {
      pluginManager.setVrmMode(true);
      expect(plugin.onDisable).toHaveBeenCalledTimes(1);
      expect(plugin.enabled).toBe(false);
      expect(vrmModePlugin.onDisable).not.toHaveBeenCalled();
      expect(vrmModePlugin.enabled).toBe(true);
    });

    test('should re-enable normal plugins when exiting vrm mode', () => {
      pluginManager.setVrmMode(true); // 진입
      plugin.onEnable.mockClear(); // 호출 카운트 초기화
      
      pluginManager.setVrmMode(false); // 종료
      expect(plugin.onEnable).toHaveBeenCalledTimes(1);
      expect(plugin.enabled).toBe(true);
    });

    test('should not change state if vrm mode is set to the same value', () => {
      pluginManager.setVrmMode(true);
      expect(plugin.onDisable).toHaveBeenCalledTimes(1);
      pluginManager.setVrmMode(true);
      expect(plugin.onDisable).toHaveBeenCalledTimes(1);
    });
  });
});
