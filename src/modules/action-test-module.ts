
import { Imodule } from './module-manager';
import { ModuleContext } from '../module-api/module-context';

/**
 * Actions API의 기능을 테스트하기 위한 간단한 모듈입니다.
 * 앱 시작 후 순차적으로 여러 액션을 실행하여 API가 올바르게 작동하는지 확인합니다.
 */
export class ActionTestModule implements Imodule {
  public readonly name = 'ActionTest';
  public enabled = true;
  private context: ModuleContext | null = null;

  setModuleContext(context: ModuleContext): void {
    this.context = context;
    console.log('[ActionTestModule] Initialized.');
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.context) return;

    this.context.eventBus.on('character_part_clicked', ({ partName }) => {
      if (!this.enabled) return;
      
      console.log(`[ActionTestModule] Event received: character_part_clicked, part: ${partName}`);
      
      const message = `${partName} 클릭됨!`;
      this.context?.actions.showMessage(message, 2);
    });

    this.context.eventBus.on('vrm:loaded', ({ vrm }) => {
      if (!this.enabled) return;
      const modelName = 'name' in vrm.meta ? vrm.meta.name : (vrm.meta as any).title;
      console.log(`[ActionTestModule] Event received: vrm:loaded. Model name: ${modelName}`);
    });

    this.context.eventBus.on('vrm:unloaded', () => {
      if (!this.enabled) return;
      console.log('[ActionTestModule] Event received: vrm:unloaded.');
    });
  }

  onEnable(): void {
    if (!this.context) return;
    const actions = this.context.actions;

    console.log('[ActionTestModule] Starting action sequence test on enable...');

    // 1. Show start message
    actions.showMessage('Action 테스트를 시작합니다.', 3);
    
    // 2. Set expression after 3 seconds
    setTimeout(() => {
      actions.showMessage('표정을 변경합니다: happy', 3);
      actions.setExpression('happy', 1.0, 0.5);
    }, 3000);

    // 3. Set pose after 6 seconds
    setTimeout(() => {
      actions.showMessage('포즈를 변경합니다: pose_stand_001.vrma', 3);
      actions.setPose('pose_stand_001.vrma');
    }, 6000);

    // 4. Play animation after 9 seconds
    setTimeout(() => {
      actions.showMessage('애니메이션을 재생합니다: VRMA_04.vrma', 3);
      actions.playAnimation('Animation/VRMA_04.vrma', false, 1.5);
    }, 9000);

    // 5. Show end message after 15 seconds
    setTimeout(() => {
      actions.showMessage('Action 테스트가 종료되었습니다.', 3);
    }, 15000);
  }

  update(deltaTime: number): void {
    // This module does not need to do anything on update
  }
}
