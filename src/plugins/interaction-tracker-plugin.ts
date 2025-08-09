// src/plugins/interaction-tracker-plugin.ts

import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';

/**
 * A core plugin that tracks user interaction and updates the character's state.
 * "Interaction" is defined as:
 * - The user sending a chat message.
 * - The user clicking on a part of the character's body.
 */
export class InteractionTrackerPlugin implements IPlugin {
  public readonly name = 'InteractionTracker';
  public enabled = true;
  public runInEditMode = true; // This should run regardless of mode

  private context!: PluginContext;

  constructor() {
    this.handleInteraction = this.handleInteraction.bind(this);
    this.handleChatMessage = this.handleChatMessage.bind(this);
  }

  setup(context: PluginContext): void {
    this.context = context;
    console.log('[InteractionTrackerPlugin] Setup complete.');
  }

  onEnable(): void {
    this.context.eventBus.on('character_part_clicked', this.handleInteraction);
    this.context.eventBus.on('chat:newMessage', this.handleChatMessage);
    console.log('[InteractionTrackerPlugin] Enabled and listening for interactions.');
  }

  onDisable(): void {
    this.context.eventBus.off('character_part_clicked', this.handleInteraction);
    this.context.eventBus.off('chat:newMessage', this.handleChatMessage);
    console.log('[InteractionTrackerPlugin] Disabled.');
  }

  private handleInteraction(): void {
    this.context.characterState.lastInteractionTimestamp = Date.now();
    console.log(`[InteractionTrackerPlugin] Interaction detected (click). Timestamp updated to ${this.context.characterState.lastInteractionTimestamp}`);
  }

  private handleChatMessage(payload: { role: string, text: string }): void {
    if (payload.role === 'user') {
      this.context.characterState.lastInteractionTimestamp = Date.now();
      console.log(`[InteractionTrackerPlugin] Interaction detected (chat). Timestamp updated to ${this.context.characterState.lastInteractionTimestamp}`);
    }
  }

  update(deltaTime: number): void {
    // This plugin is purely event-driven.
  }
}
