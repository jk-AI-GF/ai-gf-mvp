
import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';

/**
 * Actions API의 기능을 테스트하기 위한 간단한 플러그인입니다.
 * 앱 시작 후 순차적으로 여러 액션을 실행하여 API가 올바르게 작동하는지 확인합니다.
 */
export class ActionTestPlugin implements IPlugin {
  public readonly name = 'ActionTest';
  public enabled = false; // Managed by PluginManager
  private context!: PluginContext;
  private unsubs: (() => void)[] = [];

  setup(context: PluginContext): void {
    this.context = context;
    console.log('[ActionTestPlugin] Initialized.');
  }

  onEnable(): void {
    console.log('[ActionTestPlugin] Enabled.');
    this.unsubs.push(this.context.eventBus.on('character_part_clicked', ({ partName }) => {
      console.log(`[ActionTestPlugin] Event received: character_part_clicked, part: ${partName}`);
      const message = `${partName} 클릭됨!`;
      this.context.actions.showMessage(message, 2);
    }));

    this.unsubs.push(this.context.eventBus.on('character_part_right_clicked', ({ partName }) => {
      console.log(`[ActionTestPlugin] Event received: character_part_right_clicked, part: ${partName}`);
      const message = `${partName} 우클릭됨! 특별한 반응!`;
      this.context.actions.showMessage(message, 2);
    }));

    this.unsubs.push(this.context.eventBus.on('vrm:loaded', ({ vrm }) => {
      const modelName = 'name' in vrm.meta ? vrm.meta.name : (vrm.meta as any).title;
      console.log(`[ActionTestPlugin] Event received: vrm:loaded. Model name: ${modelName}`);
    }));

    this.unsubs.push(this.context.eventBus.on('vrm:unloaded', () => {
      console.log('[ActionTestPlugin] Event received: vrm:unloaded.');
    }));

    this.runActionSequence();
  }

  onDisable(): void {
    console.log('[ActionTestPlugin] Disabled.');
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
  }

  private runActionSequence() {
    const actions = this.context.actions;
    console.log('[ActionTestPlugin] Starting action sequence test...');
    actions.showMessage('Action 테스트를 시작합니다.', 3);
    setTimeout(() => actions.setExpression('happy', 1.0, 0.5), 3000);
    setTimeout(() => actions.setPose('pose_stand_001.vrma'), 6000);
    setTimeout(() => actions.playAnimation('VRMA_04.vrma', false, 1.5), 9000);
    setTimeout(() => actions.showMessage('Action 테스트가 종료되었습니다.', 3), 15000);
  }

  update(deltaTime: number): void {
    // This plugin does not need to do anything on update
  }
}
