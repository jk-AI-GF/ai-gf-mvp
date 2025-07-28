
import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';

/**
 * A test plugin to verify that time-based logic works correctly.
 * It logs the current time to the console every 10 seconds.
 */
export class TimeSyncTestPlugin implements IPlugin {
  public readonly name = 'TimeSyncTest';
  public enabled = true;
  
  private context: PluginContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  public setup(context: PluginContext): void {
    this.context = context;
    console.log('[TimeSyncTestPlugin] Setup complete. Starting timer...');

    this.intervalId = setInterval(() => {
      const now = new Date();
      console.log(`[TimeSyncTestPlugin] Current time: ${now.toLocaleTimeString()}`);
    }, 10000); // Log every 10 seconds
  }

  public update(delta: number): void {
    // This plugin does not need per-frame updates.
  }

  /**
   * This method is not part of the IPlugin interface, but can be called
   * externally (e.g., from a UI panel) to stop the plugin's activity.
   */
  public cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[TimeSyncTestPlugin] Timer stopped and cleaned up.');
    }
  }
}
