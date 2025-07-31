
import { Trigger, Context } from '../plugin-api/triggers';

export class TriggerEngine {
  private triggers: Trigger[] = [];
  private context: Context = {}; // 실제 Context 객체는 외부에서 주입받거나 업데이트될 예정

  constructor() {
    // 주기적으로 트리거를 평가하는 로직은 외부에서 update()를 호출하도록 설계
  }

  /**
   * 새로운 트리거를 등록합니다.
   * 이 메서드는 PluginContext를 통해 플러그인/모드에 노출됩니다.
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
  public async evaluateTriggers(): Promise<void> {
    // console.log('[TriggerEngine] Evaluating triggers...');
    
    const conditionPromises = this.triggers.map(trigger => {
      try {
        return Promise.resolve(trigger.condition(this.context));
      } catch (error) {
        console.error(`[TriggerEngine] Error starting condition for trigger '${trigger.name}':`, error);
        return Promise.resolve(false); // 에러 발생 시 false 처리
      }
    });

    try {
      const results = await Promise.all(conditionPromises);
      
      results.forEach((isMet, index) => {
        if (isMet) {
          const trigger = this.triggers[index];
          // console.log(`[TriggerEngine] Condition met for trigger: ${trigger.name}. Executing action.`);
          try {
            trigger.action(this.context);
            // TODO: 액션 실행 후 쿨다운, 우선순위, 병합 처리 로직 추가 필요
          } catch (error) {
            console.error(`[TriggerEngine] Error executing action for trigger '${trigger.name}':`, error);
          }
        }
      });
    } catch (error) {
      console.error('[TriggerEngine] An error occurred during condition evaluation:', error);
    }
  }
}
