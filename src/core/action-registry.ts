
import { ActionDefinition, ActionImplementation } from "../plugin-api/actions";

export class ActionRegistry {
  private actions = new Map<string, { definition: ActionDefinition; implementation: ActionImplementation }>();

  register(definition: ActionDefinition, implementation: ActionImplementation): void {
    if (this.actions.has(definition.name)) {
      console.warn(`[ActionRegistry] Action "${definition.name}" is already registered. Overwriting.`);
    }
    console.log(`[ActionRegistry] Registering action: ${definition.name}`);
    this.actions.set(definition.name, { definition, implementation });
  }

  get(name: string): { definition: ActionDefinition; implementation: ActionImplementation } | undefined {
    return this.actions.get(name);
  }

  getAllActions(): { definition: ActionDefinition; implementation: ActionImplementation }[] {
    return Array.from(this.actions.values());
  }

  getAllActionDefinitions(): ActionDefinition[] {
    return Array.from(this.actions.values()).map(a => a.definition);
  }
}
