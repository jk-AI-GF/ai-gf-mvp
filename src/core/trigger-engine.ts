
import { Trigger, Context } from '../module-api/triggers';

export class TriggerEngine {
  private triggers: Trigger[] = [];
  private context: Context = {}; // 실제 Context 객체는 외부에서 주입받거나 업데이트될 예정

  constructor() {
    // 주기적으로 트리거를 평가하는 로직은 외부에서 update()를 호출하도록 설계
  }

  /**
   * 새로운 트리거를 등록합니다.
   * 이 메서드는 PluginContext를 통해 모드에 노출됩니다.
   * @param trigger 등록할 트리거 객체
   */
  public registerTrigger(trigger: Trigger): void {
    // console.log(`[TriggerEngine] Registering trigger: ${trigger.name}`);
    this.triggers.push(trigger);
  }

  /**
   * 현재 Context를 업데이트합니다.
   * @param newContext 새로운 Context 데이터
   */
  public updateContext(newContext: Partial<Context>): void {
    this.context = { ...this.context, ...newContext };
  }

  /**
   * 등록된 모든 트리거의 조건을 평가하고, 충족되면 액션을 실행합니다.
   * 이 메서드는 앱의 메인 루프에서 주기적으로 호출되어야 합니다.
   */
  public evaluateTriggers(): void {
    // console.log('[TriggerEngine] Evaluating triggers...');
    this.triggers.forEach(trigger => {
      try {
        if (trigger.condition(this.context)) {
          // console.log(`[TriggerEngine] Condition met for trigger: ${trigger.name}. Executing action.`);
          trigger.action(this.context);
          // TODO: 액션 실행 후 쿨다운, 우선순위, 병합 처리 로직 추가 필요
        }
      } catch (error) {
        console.error(`[TriggerEngine] Error evaluating trigger '${trigger.name}':`, error);
      }
    });
  }
}
