import { PluginContext } from '../plugin-api/plugin-context';
import { Actions } from '../plugin-api/actions';

// Renderer-side representation of a trigger defined by the user
export interface CustomTrigger {
  id: string;
  name: string;
  triggerType: 'polling' | 'event';
  eventName?: string;
  condition: {
    key: string;
    operator: '==' | '!=' | '>' | '<' | 'exists' | 'not exists';
    value: string | number | boolean;
  };
  action: {
    type: keyof Actions;
    params: any[];
  };
}

/**
 * Manages the lifecycle of custom triggers created by the user.
 * It loads triggers from storage, registers them with the appropriate
 * systems (EventBus or TriggerEngine), and handles dynamic updates.
 */
export class CustomTriggerManager {
  private context: PluginContext;
  private registeredPollingTriggers: Map<string, Function> = new Map();
  private registeredEventUnsubscribers: Map<string, () => void> = new Map();

  constructor(context: PluginContext) {
    this.context = context;
    if (!this.context) {
      throw new Error('[CustomTriggerManager] PluginContext is required for initialization.');
    }
  }

  /**
   * Loads all custom triggers from storage and registers them.
   * This should be called once when the application starts.
   */
  async loadAndRegisterAll() {
    console.log('[CustomTriggerManager] Loading and registering all custom triggers...');
    const triggers: CustomTrigger[] = await window.electronAPI.getCustomTriggers();
    triggers.forEach(trigger => this.registerTrigger(trigger));
  }

  /**
   * Registers a single trigger based on its JSON definition.
   * @param trigger The custom trigger object from storage.
   */
  registerTrigger(trigger: CustomTrigger) {
    if (trigger.triggerType === 'event' && trigger.eventName) {
      this.registerEventTrigger(trigger);
    } else {
      // Polling triggers are not yet supported due to architectural constraints.
      // The TriggerEngine expects synchronous condition checks, but getting context
      // from the main process is an asynchronous operation.
      console.warn(`[CustomTriggerManager] Skipping polling trigger "${trigger.name}" as it's not yet supported.`);
    }
  }

  /**
   * Unregisters a single trigger by its ID.
   * @param triggerId The ID of the trigger to unregister.
   */
  unregisterTrigger(triggerId: string) {
    if (this.registeredEventUnsubscribers.has(triggerId)) {
      const unsubscribe = this.registeredEventUnsubscribers.get(triggerId);
      if (unsubscribe) unsubscribe();
      this.registeredEventUnsubscribers.delete(triggerId);
      console.log(`[CustomTriggerManager] Unregistered event trigger: ${triggerId}`);
    }
    
    // TODO: Add logic to unregister polling triggers if they become supported.
  }

  private registerEventTrigger(trigger: CustomTrigger) {
    if (!trigger.eventName) return;

    const handler = async (eventData: any) => {
      console.log(`[CustomTriggerManager] Event "${trigger.eventName}" received for trigger "${trigger.name}". Checking condition...`);
      
      // For event-driven triggers, the condition can check the event's payload.
      // For now, we assume the condition checks the global context store.
      // A more advanced implementation would allow checking eventData properties.
      const conditionMet = await this.checkCondition(trigger.condition);

      if (conditionMet) {
        console.log(`[CustomTriggerManager] Condition met for "${trigger.name}". Executing action.`);
        this.executeAction(trigger.action);
      }
    };

    const unsubscribe = this.context.eventBus.on(trigger.eventName as any, handler);
    this.registeredEventUnsubscribers.set(trigger.id, unsubscribe);
    console.log(`[CustomTriggerManager] Registered event trigger "${trigger.name}" on event "${trigger.eventName}".`);
  }

  private async checkCondition(condition: CustomTrigger['condition']): Promise<boolean> {
    // If no key is specified, the condition is always true.
    if (!condition.key) return true;

    try {
      const contextValue = await this.context.actions.getContext(condition.key);
      const triggerValue = this.parseConditionValue(condition.value);

      switch (condition.operator) {
        case '==': return contextValue == triggerValue;
        case '!=': return contextValue != triggerValue;
        case '>': return contextValue > triggerValue;
        case '<': return contextValue < triggerValue;
        case 'exists': return contextValue !== undefined && contextValue !== null;
        case 'not exists': return contextValue === undefined || contextValue === null;
        default: return false;
      }
    } catch (error) {
      console.error(`[CustomTriggerManager] Error checking condition for key "${condition.key}":`, error);
      return false;
    }
  }
  
  private parseConditionValue(value: any) {
    // Try to parse as a number
    if (!isNaN(value) && !isNaN(parseFloat(value))) {
      return parseFloat(value);
    }
    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    // Return as string
    return value;
  }

  private executeAction(action: CustomTrigger['action']) {
    const actionFunc = this.context.actions[action.type];
    if (typeof actionFunc === 'function') {
      // @ts-ignore
      actionFunc.apply(this.context.actions, action.params);
    } else {
      console.error(`[CustomTriggerManager] Action type "${action.type}" is not a function.`);
    }
  }
}
