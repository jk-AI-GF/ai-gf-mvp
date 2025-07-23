import { IPlugin } from './plugin-manager';
import { VRM } from '@pixiv/three-vrm';

/**
 * VRM 모델이 주기적으로 유휴 애니메이션을 재생하도록 하는 플러그인입니다.
 */
export class AutoIdleAnimationPlugin implements IPlugin {
  public readonly name = 'AutoIdleAnimation';
  public enabled = true;

  private timeSinceLastIdle = 0.0;
  private nextIdleTime = 0.0;
  private readonly idleAnimationFiles: string[];

  constructor() {
    // 유휴 애니메이션 파일 목록을 정의합니다.
    this.idleAnimationFiles = [
      'assets/Animation/VRMA_01.vrma',
      'assets/Animation/VRMA_02.vrma',
      'assets/Animation/VRMA_03.vrma',
      'assets/Animation/VRMA_04.vrma',
      'assets/Animation/VRMA_05.vrma',
      'assets/Animation/VRMA_06.vrma',
      'assets/Animation/VRMA_07.vrma',
    ];
    this.resetIdleTimer();
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
   * @param vrm VRM 모델 인스턴스 (이 플러그인에서는 직접 사용하지 않음)
   */
  public update(delta: number, vrm: VRM): void {
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

    if (window.loadAnimationFile) {
      // 1.5초 동안 부드럽게 전환하도록 옵션을 전달합니다. (loop는 제거)
      window.loadAnimationFile(animationFile, { crossFadeDuration: 1.5 });
    }
  }
}
