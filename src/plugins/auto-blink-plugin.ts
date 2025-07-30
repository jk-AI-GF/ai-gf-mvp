import { IPlugin } from './plugin-manager';
import { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { PluginContext } from '../plugin-api/plugin-context';

/**
 * VRM 모델이 자동으로 눈을 깜빡이도록 하는 플러그인입니다.
 */
export class AutoBlinkPlugin implements IPlugin {
  public readonly name = 'AutoBlink';
  public enabled = true;
  public runInEditMode = true;

  private context!: PluginContext;
  private timeSinceLastBlink = 0.0;
  private nextBlinkTime = 0.0;

  constructor() {
    this.resetBlinkTimer();
  }

  public setup(context: PluginContext): void {
    this.context = context;
  }

  public onEnable(): void {
    this.resetBlinkTimer();
  }

  public onDisable(): void {
    // No specific cleanup needed as logic is in update()
  }

  /**
   * 다음 깜빡임까지의 시간을 랜덤으로 재설정합니다.
   */
  private resetBlinkTimer(): void {
    this.timeSinceLastBlink = 0.0;
    // 1.5초에서 7.5초 사이의 랜덤한 시간 후에 다음 깜빡임을 설정합니다.
    this.nextBlinkTime = Math.random() * 6.0 + 1.5;
  }

  /**
   * 매 프레임마다 호출되어 깜빡임 로직을 처리합니다.
   * @param delta 마지막 프레임 이후의 시간 (초)
   * @param vrm VRM 모델 인스턴스
   */
  public update(delta: number): void {
    this.timeSinceLastBlink += delta;

    if (this.timeSinceLastBlink >= this.nextBlinkTime) {
      this.resetBlinkTimer();

      // 다른 표정에 영향을 주지 않는 animateExpressionAdditive 함수를 사용합니다.
      if (this.context.actions) {
        // 0.075초 동안 빠르게 눈을 감습니다.
        this.context.actions.setExpression(VRMExpressionPresetName.Blink, 1.0, 0.075);

        // 100ms 후에 0.15초 동안 천천히 눈을 뜹니다.
        setTimeout(() => {
          this.context.actions.setExpression(VRMExpressionPresetName.Blink, 0.0, 0.15);
        }, 100);
      }
    }
  }
}
