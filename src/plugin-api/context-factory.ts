import { VRMManager } from '../renderer/vrm-manager';
import { Actions } from './actions';
import { SystemControls } from './system-controls';
import { PluginContext } from './plugin-context';
import eventBus from '../core/event-bus';
import { TriggerEngine } from '../core/trigger-engine';
import { characterState } from '../core/character-state';
import { ActionRegistry } from '../core/action-registry';

// This factory creates the context object that plugins will use to interact with the system.
// It encapsulates the direct dependencies on managers and services.

export function createPluginContext(
  vrmManager: VRMManager,
  triggerEngine: TriggerEngine,
  systemControls: SystemControls,
  actionRegistry: ActionRegistry, // ActionRegistry를 주입받음
): PluginContext {

  // ActionRegistry로부터 동적으로 actions 객체 생성
  const actions: Actions = {
    getAvailableActions: () => Promise.resolve(actionRegistry.getAllActionDefinitions()),
  };

  actionRegistry.getAllActions().forEach(({ definition, implementation }) => {
    actions[definition.name] = implementation;
  });

  const pluginContext: PluginContext = {
    eventBus: eventBus,
    registerTrigger: (trigger) => triggerEngine.registerTrigger(trigger),
    actions: actions,
    system: systemControls,
    get: (key: string) => window.electronAPI.invoke('context:get', key),
    set: (key: string, value: any) => window.electronAPI.send('context:set', key, value),
    getAll: () => window.electronAPI.invoke('context:getAll'),
    characterState: characterState,
    vrmManager: vrmManager,
    actionRegistry: actionRegistry,
  };

  return pluginContext;
}
