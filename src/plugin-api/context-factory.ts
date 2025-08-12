import { VRMManager } from '../renderer/vrm-manager';
import { Actions } from './actions';
import { SystemControls } from './system-controls';
import { PluginContext } from './plugin-context';
import eventBus from '../core/event-bus';
import { characterState } from '../core/character-state';
import { ActionRegistry } from '../core/action-registry';
import { ContextStore } from '../core/context-store';

// This factory creates the context object that plugins will use to interact with the system.
// It encapsulates the direct dependencies on managers and services.

// Create a single, shared ContextStore instance for the entire renderer process.
const rendererContextStore = new ContextStore();

export function createPluginContext(
  vrmManager: VRMManager,
  systemControls: SystemControls,
  actionRegistry: ActionRegistry, // ActionRegistry를 주입받음
): PluginContext {

  // ActionRegistry를 동적으로 조회하는 Proxy를 생성합니다.
  // 이렇게 하면 컨텍스트가 생성된 후에 등록되는 액션도 호출할 수 있습니다.
  const actions: Actions = new Proxy({} as Actions, {
    get(target, prop, receiver) {
      const actionName = prop as string;

      // 'getAvailableActions'는 특별 케이스로 처리
      if (actionName === 'getAvailableActions') {
        return () => Promise.resolve(actionRegistry.getAllActionDefinitions());
      }

      // 다른 모든 속성(액션 이름)은 ActionRegistry에서 동적으로 조회
      const action = actionRegistry.get(actionName);
      if (action) {
        return action.implementation;
      }

      // 액션이 없으면 undefined 반환
      console.warn(`[PluginContext] Action "${actionName}" not found in ActionRegistry.`);
      return undefined;
    },
  });

  const pluginContext: PluginContext = {
    eventBus: eventBus,
    actions: actions,
    system: systemControls,
    get: (key: string) => rendererContextStore.get(key),
    set: (key: string, value: any) => rendererContextStore.set(key, value),
    getAll: () => rendererContextStore.getAll(),
    characterState: characterState,
    vrmManager: vrmManager,
    actionRegistry: actionRegistry,
  };

  return pluginContext;
}