import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';

/**
 * A test plugin to verify that time-based logic works correctly.
 * It logs the current time to the console every 10 seconds.
 */
export class TimeSyncTestPlugin implements IPlugin {
  public readonly name = 'TimeSyncTest';
  public enabled = false;
  runInEditMode = true; // 이 플러그인은 테스트 목적이므로 편집 모드에서도 실행되도록 설정

  private context: PluginContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  public setup(context: PluginContext): void {
    this.context = context;
    console.log('[TimeSyncTestPlugin] Setup complete.');
  }

  public onEnable(): void {
    console.log('[TimeSyncTestPlugin] Plugin enabled. Starting timer...');
    this.intervalId = setInterval(() => {
      const now = new Date();
      console.log(`[TimeSyncTestPlugin] Current time: ${now.toLocaleTimeString()}`);
    }, 10000); // Log every 10 seconds
  }

  public onDisable(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[TimeSyncTestPlugin] Timer stopped and cleaned up.');
    }
  }

  public update(delta: number): void {
    // This plugin does not need per-frame updates.
  }
}