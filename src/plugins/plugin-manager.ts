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
   * 플러그인이 등록될 때 PluginManager에 의해 한 번만 호출됩니다.
   * 이벤트 리스너 등록 등 초기 설정 로직을 여기에 배치해야 합니다.
   * @param context 플러그인이 앱과 상호작용할 수 있는 모든 API를 포함하는 객체
   * @param manager 플러그인 관리자 인스턴스
   */
  setup(context: PluginContext, manager: PluginManager): void;

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
    // `setup` 메서드를 호출하여 플러그인을 초기화합니다.
    plugin.setup(this.context, this);
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
