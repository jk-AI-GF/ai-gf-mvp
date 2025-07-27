import { VRM } from '@pixiv/three-vrm';
import { PluginContext } from '../plugin-api/plugin-context';

/**
 * 모든 플러그인이 구현해야 하는 인터페이스입니다.
 */
export interface IPlugin {
  /** 플러그인의 고유한 이름 */
  readonly name: string;
  
  /** 플러그인이 활성화되었는지 여부 */
  enabled: boolean;

  /**
   * 매 프레임마다 호출될 메서드입니다.
   * @param delta 마지막 프레임 이후의 시간 (초)
   * @param vrm VRM 모델 인스턴스
   */
  update(delta: number, vrm: VRM): void;

  /**
   * 플러그인에 PluginContext 객체를 설정합니다.
   * @param context 플러그인이 앱과 상호작용할 수 있는 모든 API를 포함하는 객체
   */
  setPluginContext(context: PluginContext): void;

  /**
   * 플러그인이 처음 활성화되고 업데이트되기 직전에 한 번 호출됩니다.
   * 초기화 로직에 사용될 수 있습니다.
   */
  onStart?(): void;

  /**
   * 플러그인이 활성화될 때마다 호출됩니다.
   */
  onEnable?(): void;
}

/**
 * 플러그인을 관리하는 중앙 클래스입니다.
 */
export class PluginManager {
  public plugins: Map<string, IPlugin> = new Map();
  private startedPlugins: Set<string> = new Set();
  public context: PluginContext;

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
    plugin.setPluginContext(this.context);
    console.log(`Plugin registered: ${plugin.name}`);
  }

  /**
   * 등록된 플러그인을 이름으로 비활성화합니다.
   * @param name 비활성화할 플러그인의 이름
   */
  disable(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.enabled = false;
      console.log(`Plugin disabled: ${name}`);
    }
  }

  /**
   * 등록된 플러그인을 이름으로 활성화합니다.
   * @param name 활성화할 플러그인의 이름
   */
  enable(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.enabled = true;
      if (typeof plugin.onEnable === 'function') {
        plugin.onEnable();
      }
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
        // 플러그인이 처음 시작되는 경우 onStart를 호출합니다.
        if (!this.startedPlugins.has(plugin.name)) {
          if (typeof plugin.onStart === 'function') {
            plugin.onStart();
          }
          this.startedPlugins.add(plugin.name);
        }
        plugin.update(delta, vrm);
      }
    }
  }
}
