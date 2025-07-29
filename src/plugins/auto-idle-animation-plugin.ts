import { VRM } from '@pixiv/three-vrm';
import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';

export class AutoIdleAnimationPlugin implements IPlugin {
  public readonly name = 'AutoIdleAnimation';
  public enabled = false;
  private context!: PluginContext;

  private readonly IDLE_ANIMATION_FILES = [
    'VRMA_01.vrma', 'VRMA_02.vrma', 'VRMA_03.vrma', 
    'VRMA_04.vrma', 'VRMA_05.vrma', 'VRMA_06.vrma', 'VRMA_07.vrma'
  ];
  private idleTime = 0;
  private nextIdleTime = 5; // Start first idle animation after 5 seconds

  setup(context: PluginContext): void {
    this.context = context;
  }

  onEnable(): void {
    this.resetTimer();
  }

  onDisable(): void {
    // No specific cleanup needed as logic is in update()
  }

  update(delta: number, vrm: VRM): void {
    if (!this.context.actions) return;

    this.idleTime += delta;

    if (this.idleTime >= this.nextIdleTime) {
      this.playRandomIdleAnimation();
      this.resetTimer();
    }
  }

  private playRandomIdleAnimation(): void {
    const randomIndex = Math.floor(Math.random() * this.IDLE_ANIMATION_FILES.length);
    const animationFile = this.IDLE_ANIMATION_FILES[randomIndex];
    console.log(`[AutoIdleAnimation] Playing idle animation: ${animationFile}`);
    this.context.actions.playAnimation(`Animation/${animationFile}`, false, 1.5);
  }

  private resetTimer(): void {
    this.idleTime = 0;
    this.nextIdleTime = 10 + Math.random() * 10; // Next animation in 10-20 seconds
  }
}

