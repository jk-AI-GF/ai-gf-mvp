import { Imodule } from './module-manager';
import { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { Actions } from '../module-api/actions';

/**
 * VRM 모델이 자동으로 눈을 깜빡이도록 하는 모듈입니다.
 */
export class AutoBlinkmodule implements Imodule {
  public readonly name = 'AutoBlink';
  public enabled = true;

  private actions: Actions;
  private timeSinceLastBlink = 0.0;
  private nextBlinkTime = 0.0;

  constructor() {
    this.resetBlinkTimer();
  }

  public setActions(actions: Actions): void {
    this.actions = actions;
  }

  /**
   * 다음 깜빡임까지의 시간을 랜덤으로 재설정합니다.
   */
  private resetBlinkTimer(): void {
    this.timeSinceLastBlink = 0.0;
    // 1.5초에서 7.5초 사이의 랜덤한 시간 후에 다음 깜빡임을 설정합니다.
    this.nextBlinkTime = Math.random() * 6.0 + 1.5;
  }

  public setup(vrm: VRM): void {
    // Blink uses expressions, which are already part of the VRM.
    // No specific setup is needed for this module.
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
      if (this.actions) {
        // 0.075초 동안 빠르게 눈을 감습니다.
        this.actions.setExpression(VRMExpressionPresetName.Blink, 1.0, 0.075);

        // 100ms 후에 0.15초 동안 천천히 눈을 뜹니다.
        setTimeout(() => {
          this.actions.setExpression(VRMExpressionPresetName.Blink, 0.0, 0.15);
        }, 100);
      }
    }
  }
}
