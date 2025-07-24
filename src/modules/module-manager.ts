import { VRM } from '@pixiv/three-vrm';
import { Actions } from '../module-api/actions';

/**
 * 모든 모듈이 구현해야 하는 인터페이스입니다.
 */
export interface Imodule {
  /** 모듈의 고유한 이름 */
  readonly name: string;
  
  /** 모듈이 활성화되었는지 여부 */
  enabled: boolean;

  /**
   * 모듈 초기화 시 호출될 수 있습니다.
   * @param vrm VRM 모델 인스턴스
   */
  // constructor(vrm: VRM, ...args: any[]): void;

  /**
   * 매 프레임마다 호출될 메서드입니다.
   * @param delta 마지막 프레임 이후의 시간 (초)
   * @param vrm VRM 모델 인스턴스
   */
  update(delta: number, vrm: VRM): void;

  /**
   * 모듈에 Actions 객체를 설정합니다.
   * @param actions 게임 내 액션들을 호출할 수 있는 객체
   */
  setActions(actions: Actions): void;
}

/**
 * 모듈을 관리하는 중앙 클래스입니다.
 */
export class ModuleManager {
  private modules: Map<string, Imodule> = new Map();
  private actions: Actions;

  constructor(actions: Actions) {
    this.actions = actions;
  }

  /**
   * 새로운 모듈을 등록합니다.
   * @param module 등록할 모듈 인스턴스
   */
  register(module: Imodule): void {
    if (this.modules.has(module.name)) {
      console.warn(`module with name "${module.name}" is already registered.`);
      return;
    }
    this.modules.set(module.name, module);
    module.setActions(this.actions);
    console.log(`module registered: ${module.name}`);
  }

  /**
   * 등록된 모듈을 이름으로 비활성화합니다.
   * @param name 비활성화할 모듈의 이름
   */
  disable(name: string): void {
    const module = this.modules.get(name);
    if (module) {
      module.enabled = false;
      console.log(`module disabled: ${name}`);
    }
  }

  /**
   * 등록된 모듈을 이름으로 활성화합니다.
   * @param name 활성화할 모듈의 이름
   */
  enable(name: string): void {
    const module = this.modules.get(name);
    if (module) {
      module.enabled = true;
      console.log(`module enabled: ${name}`);
    }
  }

  /**
   * 등록된 모든 활성화된 모듈의 update 메서드를 호출합니다.
   * @param delta 마지막 프레임 이후의 시간 (초)
   * @param vrm VRM 모델 인스턴스
   */
  update(delta: number, vrm: VRM): void {
    if (!vrm) return;
    for (const module of this.modules.values()) {
      if (module.enabled) {
        module.update(delta, vrm);
      }
    }
  }
}
