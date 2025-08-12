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

  private handleLlmResponse = async (data: { text: string; expression: string }): Promise<void> => {
    if (!this.context) return;

    const { type } = data as any;

    if (type === 'action') {
      const { subroutine, arguments: args, expression, text } = data as any;
      
      const subroutineFileName = this.context.sequenceManager?.findSubroutineFileByName(subroutine);

      if (subroutineFileName) {
        await this.context.sequenceManager?.runSubroutine(subroutineFileName, args);
        this.context.actions.setExpression(expression, 1.0, 0.5);
        this.context.actions.playTTS(text);
      } else {
        console.warn(`[LlmResponseHandlerPlugin] Subroutine with name '${subroutine}' not found. Falling back to talk.`);
        this.context.actions.setExpression(expression, 1.0, 0.5);
        this.context.actions.playTTS(text);
      }
    } else if (type === 'action_array') {
      const { subroutines, expression, text } = data as any;
      
      this.context.actions.setExpression(expression, 1.0, 0.5);
      this.context.actions.playTTS(text);

      if (subroutines && Array.isArray(subroutines)) {
        for (const sub of subroutines) {
          const { subroutine: subroutineName, arguments: args } = sub;
          const subroutineFileName = this.context.sequenceManager?.findSubroutineFileByName(subroutineName);
          if (subroutineFileName) {
            await this.context.sequenceManager?.runSubroutine(subroutineFileName, args);
          } else {
            console.warn(`[LlmResponseHandlerPlugin] Subroutine with name '${subroutineName}' not found in sequence. Skipping.`);
          }
        }
      }
    } else {
      const { text, expression } = data as any;
      this.context.actions.setExpression(expression, 1.0, 0.5);
      this.context.actions.playTTS(text);
    }
  };

  public update(delta: number): void {
    // This plugin is event-driven and does not need per-frame updates.
  }
}
