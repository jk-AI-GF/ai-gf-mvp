import { VRM } from '@pixiv/three-vrm';
import { PluginContext } from '../plugin-api/plugin-context';

/**
 * 모든 플러그인이 구현해야 하는 인터페이스입니다.
 */
export interface IPlugin {
  /** 플러그인의 고유한 이름 */
  readonly name: string;
  
  /** 플러그인이 활성화되었는지 여부. PluginManager가 관리합니다. */
  enabled: boolean;

  /**
   * 편집 모드에서도 플러그인을 실행할지 여부.
   * @default false
   */
  runInEditMode?: boolean;

  /**
   * 플러그인이 등록될 때 한 번만 호출됩니다.
   * @param context 플러그인이 앱과 상호작용할 수 있는 모든 API를 포함하는 객체
   */
  setup(context: PluginContext): void;

  /**
   * 플러그인이 활성화될 때 호출됩니다.
   * 이벤트 리스너 등록, 타이머 시작 등 실제 동작 로직을 여기에 배치합니다.
   */
  onEnable(): void;

  /**
   * 플러그인이 비활성화될 때 호출됩니다.
   * onEnable에서 등록한 모든 리스너와 타이머를 정리해야 합니다.
   */
  onDisable(): void;

  /**
   * 매 프레임마다 호출될 메서드입니다.
   * @param delta 마지막 프레임 이후의 시간 (초)
   * @param vrm VRM 모델 인스턴스
   */
  update(delta: number, vrm: VRM): void;
}

/**
 * 플러그인을 관리하는 중앙 클래스입니다.
 */
export class PluginManager {
  public plugins: Map<string, IPlugin> = new Map();
  public context: PluginContext;
  private isEditMode = false;

  constructor(context: PluginContext) {
    this.context = context;
  }

  /**
   * 새로운 플러그인을 등록합니다.
   * @param plugin 등록할 플러그인 인스턴스
   */
  register(plugin: IPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin with name "${plugin.name}" is already registered.`);
      return;
    }
    this.plugins.set(plugin.name, plugin);
    plugin.setup(this.context);
    
    // 편집 모드가 아닐 경우에만 즉시 활성화
    if (!this.isEditMode || plugin.runInEditMode) {
      this.enable(plugin.name);
    }
    
    console.log(`Plugin registered: ${plugin.name}`);
  }

  /**
   * 편집 모드 상태를 설정하고, 상태에 따라 플러그인을 활성화/비활성화합니다.
   * @param isEditMode 새로운 편집 모드 상태
   */
  setEditMode(isEditMode: boolean): void {
    if (this.isEditMode === isEditMode) return;
    this.isEditMode = isEditMode;

    for (const plugin of this.plugins.values()) {
      if (this.isEditMode && !plugin.runInEditMode) {
        // 편집 모드 진입: runInEditMode가 false인 플러그인 비활성화
        this.disable(plugin.name);
      } else if (!this.isEditMode) {
        // 편집 모드 종료: 모든 플러그인 활성화 (이미 활성화된 것은 무시됨)
        this.enable(plugin.name);
      }
    }
  }

  /**
   * 등록된 플러그인을 이름으로 비활성화합니다.
   * @param name 비활성화할 플러그인의 이름
   */
  disable(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin && plugin.enabled) {
      plugin.enabled = false;
      plugin.onDisable();
      console.log(`Plugin disabled: ${name}`);
    }
  }

  /**
   * 등록된 플러그인을 이름으로 활성화합니다.
   * @param name 활성화할 플러그인의 이름
   */
  enable(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin && !plugin.enabled) {
      plugin.enabled = true;
      plugin.onEnable();
      console.log(`Plugin enabled: ${name}`);
    }
  }

  /**
   * 등록된 모든 활성화된 플러그인의 update 메서드를 호출합니다.
   * @param delta 마지막 프레임 이후의 시간 (초)
   * @param vrm VRM 모델 인스턴스
   */
  update(delta: number, vrm: VRM): void {
    if (!vrm) return;
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled) {
        plugin.update(delta, vrm);
      }
    }
  }
}
