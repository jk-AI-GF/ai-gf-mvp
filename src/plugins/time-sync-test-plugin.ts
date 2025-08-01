import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';

/**
 * A test plugin to verify that time-based logic works correctly using the Trigger system.
 * It logs the current time to the console every 10 seconds.
 */
export class TimeSyncTestPlugin implements IPlugin {
  public readonly name = 'TimeSyncTest';
  public enabled = true; // This plugin is for testing, so enable by default.
  runInEditMode = true;

  private context: PluginContext | null = null;
  private lastLogTime = 0;

  public setup(context: PluginContext): void {
    this.context = context;
    console.log('[TimeSyncTestPlugin] Setup complete. Registering trigger...');

    this.lastLogTime = Date.now();

    context.registerTrigger({
      name: 'TimeSyncLogger',
      // Condition: Check if 10 seconds have passed since the last log.
      condition: () => {
        return Date.now() - this.lastLogTime > 10000;
      },
      // Action: Log the time and reset the timer.
      action: () => {
        const now = new Date();
        console.log(`[TimeSyncTestPlugin] Current time via Trigger: ${now.toLocaleTimeString()}`);
        this.lastLogTime = Date.now();
      },
    });
  }

  public onEnable(): void {
    // The trigger is automatically managed by the TriggerEngine based on
    // the plugin's enabled state. No need to start/stop intervals here.
    console.log('[TimeSyncTestPlugin] Plugin enabled.');
    // Reset last log time to prevent immediate trigger firing on re-enable
    this.lastLogTime = Date.now();
  }

  public onDisable(): void {
    // The trigger is automatically paused when the plugin is disabled.
    // No cleanup needed for intervals.
    console.log('[TimeSyncTestPlugin] Plugin disabled.');
  }

  public update(delta: number): void {
    // This plugin does not need per-frame updates.
  }
}