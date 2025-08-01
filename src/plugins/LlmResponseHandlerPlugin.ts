import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';

/**
 * This plugin listens for processed LLM responses and translates them into
 * character actions, such as speaking and changing expressions.
 * It decouples the ChatService from direct character control.
 */
export class LlmResponseHandlerPlugin implements IPlugin {
  public readonly name = 'LlmResponseHandler';
  public enabled = true;
  public runInEditMode = false;

  private context: PluginContext | null = null;

  public setup(context: PluginContext): void {
    this.context = context;
    console.log('[LlmResponseHandlerPlugin] Setup complete.');
  }

  public onEnable(): void {
    console.log('[LlmResponseHandlerPlugin] Plugin enabled.');
    this.context?.eventBus.on('llm:responseReceived', this.handleLlmResponse);
  }

  public onDisable(): void {
    console.log('[LlmResponseHandlerPlugin] Plugin disabled.');
    this.context?.eventBus.off('llm:responseReceived', this.handleLlmResponse);
  }

  private handleLlmResponse = (data: { text: string; expression: string }): void => {
    if (!this.context) return;

    const { text, expression } = data;

    // Use the actions API to make the character perform the actions
    this.context.actions.setExpression(expression, 1.0, 0.5);
    this.context.actions.playTTS(text);
  };

  public update(delta: number): void {
    // This plugin is event-driven and does not need per-frame updates.
  }
}
