import { Imodule } from './module-manager';
import { Actions } from '../module-api/actions';

/**
 * VRM 모델이 주기적으로 유휴 애니메이션을 재생하도록 하는 모듈입니다.
 */
export class AutoIdleAnimationmodule implements Imodule {
  public readonly name = 'AutoIdleAnimation';
  public enabled = false;

  private actions: Actions;
  private timeSinceLastIdle = 0.0;
  private nextIdleTime = 0.0;
  private readonly idleAnimationFiles: string[];

  constructor() {
    // 유휴 애니메이션 파일 목록을 정의합니다.
    this.idleAnimationFiles = [
      'Animation/VRMA_01.vrma',
      'Animation/VRMA_02.vrma',
      'Animation/VRMA_03.vrma',
      'Animation/VRMA_04.vrma',
      'Animation/VRMA_05.vrma',
      'Animation/VRMA_06.vrma',
      'Animation/VRMA_07.vrma',
    ];
    this.resetIdleTimer();
  }

  public setActions(actions: Actions): void {
    this.actions = actions;
  }

  /**
   * 다음 애니메이션 재생까지의 시간을 랜덤으로 재설정합니다.
   */
  private resetIdleTimer(): void {
    this.timeSinceLastIdle = 0.0;
    // 10초에서 25초 사이의 랜덤한 시간 후에 다음 애니메이션을 재생합니다.
    this.nextIdleTime = Math.random() * 15.0 + 10.0;
  }

  /**
   * 매 프레임마다 호출되어 유휴 애니메이션 재생 로직을 처리합니다.
   * @param delta 마지막 프레임 이후의 시간 (초)
   * @param vrm VRM 모델 인스턴스 (이 모듈에서는 직접 사용하지 않음)
   */
  public update(delta: number): void {
    this.timeSinceLastIdle += delta;

    if (this.timeSinceLastIdle >= this.nextIdleTime) {
      this.playRandomIdleAnimation();
      this.resetIdleTimer();
    }
  }

  /**
   * 유휴 애니메이션 목록에서 하나를 랜덤하게 선택하여 재생합니다.
   */
  private playRandomIdleAnimation(): void {
    if (this.idleAnimationFiles.length === 0) return;

    const randomIndex = Math.floor(Math.random() * this.idleAnimationFiles.length);
    const animationFile = this.idleAnimationFiles[randomIndex];

    console.log(`Playing idle animation: ${animationFile}`);

    if (this.actions) {
      // 1.5초 동안 부드럽게 전환하도록 옵션을 전달합니다.
      this.actions.playAnimation(animationFile, false, 1.5);
    }
  }
}
