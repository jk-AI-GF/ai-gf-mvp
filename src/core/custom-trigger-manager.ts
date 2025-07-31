import { PluginContext } from '../plugin-api/plugin-context';
import { Actions } from '../plugin-api/actions';

// Renderer-side representation of a trigger defined by the user
export interface CustomTrigger {
  id: string;
  name: string;
  enabled: boolean;
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
    triggers.forEach(trigger => {
      if (trigger.enabled) {
        this.registerTrigger(trigger)
      }
    });
  }

  /**
   * Registers a single trigger based on its JSON definition.
   * @param trigger The custom trigger object from storage.
   */
  registerTrigger(trigger: CustomTrigger) {
    if (this.registeredPollingTriggers.has(trigger.id) || this.registeredEventUnsubscribers.has(trigger.id)) {
      console.warn(`[CustomTriggerManager] Trigger "${trigger.name}" is already registered. Skipping.`);
      return;
    }

    if (trigger.triggerType === 'event' && trigger.eventName) {
      this.registerEventTrigger(trigger);
    } else if (trigger.triggerType === 'polling') {
      this.registerPollingTrigger(trigger);
    }
  }

  /**
   * Unregisters a single trigger by its ID.
   * @param triggerId The ID of the trigger to unregister.
   */
  unregisterTrigger(triggerId: string) {
    // Unregister event trigger
    if (this.registeredEventUnsubscribers.has(triggerId)) {
      const unsubscribe = this.registeredEventUnsubscribers.get(triggerId);
      if (unsubscribe) unsubscribe();
      this.registeredEventUnsubscribers.delete(triggerId);
      console.log(`[CustomTriggerManager] Unregistered event trigger: ${triggerId}`);
    }
    
    // Unregister polling trigger
    if (this.registeredPollingTriggers.has(triggerId)) {
      // To "unregister" a polling trigger, we need to remove it from the TriggerEngine's list.
      // This requires a new method in TriggerEngine, e.g., unregisterTriggerById(id).
      // For now, we'll just remove it from our internal map. A proper implementation
      // would require modifying TriggerEngine.
      // As a workaround, we can modify the trigger's condition to always be false.
      const originalTrigger = this.registeredPollingTriggers.get(triggerId);
      if (originalTrigger) {
        // This is a bit of a hack. A better way is to have TriggerEngine.unregister(id)
        // @ts-ignore
        originalTrigger.condition = () => Promise.resolve(false); 
        this.registeredPollingTriggers.delete(triggerId);
        console.log(`[CustomTriggerManager] Deactivated polling trigger: ${triggerId}`);
      }
    }
  }

  private registerPollingTrigger(trigger: CustomTrigger) {
    const condition = async (): Promise<boolean> => {
      return this.checkCondition(trigger.condition);
    };

    const action = () => {
      this.executeAction(trigger.action);
    };

    const engineTrigger = {
      name: trigger.name,
      condition,
      action,
    };

    // We need a way to reference this trigger later for unregistering.
    // Storing the trigger object itself allows us to modify it later if needed (the hacky unregister).
    this.registeredPollingTriggers.set(trigger.id, engineTrigger as any);
    
    // @ts-ignore The Trigger type in TriggerEngine might not expect a Promise, but we've updated it.
    this.context.registerTrigger(engineTrigger);
    console.log(`[CustomTriggerManager] Registered polling trigger "${trigger.name}".`);
  }

  private registerEventTrigger(trigger: CustomTrigger) {
    if (!trigger.eventName) return;

    const handler = async (eventData: any) => {
      console.log(`[CustomTriggerManager] Event "${trigger.eventName}" received for trigger "${trigger.name}". Checking condition...`);
      
      // Pass the event payload to the condition checker
      const conditionMet = await this.checkCondition(trigger.condition, eventData);

      if (conditionMet) {
        console.log(`[CustomTriggerManager] Condition met for "${trigger.name}". Executing action.`);
        this.executeAction(trigger.action);
      }
    };

    const unsubscribe = this.context.eventBus.on(trigger.eventName as any, handler);
    this.registeredEventUnsubscribers.set(trigger.id, unsubscribe);
    console.log(`[CustomTriggerManager] Registered event trigger "${trigger.name}" on event "${trigger.eventName}".`);
  }

  private async checkCondition(condition: CustomTrigger['condition'], eventData?: any): Promise<boolean> {
    // If no key is specified, the condition is always true.
    if (!condition.key) return true;

    let contextValue: any;
    const conditionKey = condition.key;

    try {
      // Check if the key uses the 'event.' prefix
      if (conditionKey.startsWith('event.')) {
        const eventPropertyKey = conditionKey.substring(6); // Remove 'event.'
        // Use a helper to safely access nested properties e.g., "event.data.text"
        contextValue = eventPropertyKey.split('.').reduce((o, k) => (o || {})[k], eventData);
      } else {
        // Otherwise, fetch from the global context store
        contextValue = await this.context.actions.getContext(conditionKey);
      }
      
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
      console.error(`[CustomTriggerManager] Error checking condition for key "${conditionKey}":`, error);
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
