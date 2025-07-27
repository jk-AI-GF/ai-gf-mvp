
import { VRMManager } from '../renderer/vrm-manager';
import { EventBus } from './event-bus';
import { Trigger, Condition, Action } from './triggers';
import { Actions } from './actions';
import { SystemControls } from './system-controls';
import { characterState } from '../core/character-state';

/**
 * 캐릭터 상태에 대한 인터페이스입니다.
 * 메인 프로세스와 렌더러 프로세스 간에 공유됩니다.
 */
export interface ICharacterState {
  curiosity: number;
}

// 플러그인과 모드가 앱과 상호작용할 수 있는 모든 API를 정의하는 컨텍스트 객체입니다.
export interface PluginContext {
  /**
   * 앱의 중앙 이벤트 버스에 접근하여 이벤트를 발행하거나 구독할 수 있습니다.
   */
  eventBus: EventBus;

  /**
   * 새로운 트리거(조건 -> 행동)를 앱에 등록합니다.
   * @param trigger 등록할 트리거 객체
   */
  registerTrigger(trigger: Trigger): void;

  /**
   * 플러그인/모드가 게임에 영향을 줄 수 있는 함수 호출을 제공합니다.
   */
  actions: Actions;

  /**
   * 플러그인/모드가 시스템 수준의 기능을 제어할 수 있는 함수 호출을 제공합니다.
   */
  system: SystemControls;

  /**
   * 캐릭터의 현재 상태(예: 호기심 수준)에 접근합니다.
   */
  characterState: ICharacterState;

  /**
   * VRM 관리자에 직접 접근합니다. (렌더러 프로세스에서만 사용 가능, 주의해서 사용)
   */
  vrmManager?: VRMManager;

  // 향후 추가될 API 예시:
  // getCurrentPersona(): Persona;
  // playAnimation(animationName: string): void;
  // showNotification(message: string): void;
}
