
import { EventBus } from './event-bus';
import { Trigger, Condition, Action } from './triggers';

// 모드가 앱과 상호작용할 수 있는 모든 API를 정의하는 컨텍스트 객체입니다.
export interface ModuleContext {
  /**
   * 앱의 중앙 이벤트 버스에 접근하여 이벤트를 발행하거나 구독할 수 있습니다.
   */
  eventBus: EventBus;

  /**
   * 새로운 트리거(조건 -> 행동)를 앱에 등록합니다.
   * @param trigger 등록할 트리거 객체
   */
  registerTrigger(trigger: Trigger): void;

  // 향후 추가될 API 예시:
  // getCurrentPersona(): Persona;
  // playAnimation(animationName: string): void;
  // showNotification(message: string): void;
}
