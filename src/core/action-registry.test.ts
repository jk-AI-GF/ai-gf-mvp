// src/core/action-registry.test.ts

import { ActionRegistry } from './action-registry';
import { PluginContext } from '../plugin-api/plugin-context';
import { ActionDefinition, ActionImplementation } from '../plugin-api/actions';

describe('ActionRegistry', () => {
  let actionRegistry: ActionRegistry;
  let mockContext: PluginContext;

  beforeEach(() => {
    actionRegistry = new ActionRegistry();
    mockContext = {
      vrmManager: {},
    } as unknown as PluginContext;
    // console.warn과 console.log를 모킹하여 테스트 출력 오염 방지 및 호출 여부 확인
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // 각 테스트 후 모킹 복원
    jest.restoreAllMocks();
  });

  test('should be created', () => {
    expect(actionRegistry).toBeInstanceOf(ActionRegistry);
  });

  test('should register an action', () => {
    const mockDefinition: ActionDefinition = {
      name: 'testAction',
      description: 'A test action',
      params: [],
    };
    const mockImplementation: ActionImplementation = jest.fn();

    actionRegistry.register(mockDefinition, mockImplementation);

    const actions = actionRegistry.getAllActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].definition.name).toBe('testAction');
  });

  test('should get an action by name', () => {
    const mockDefinition: ActionDefinition = {
      name: 'findMe',
      description: 'Action to be found',
      params: [],
    };
    const mockImplementation: ActionImplementation = jest.fn();

    actionRegistry.register(mockDefinition, mockImplementation);

    const foundAction = actionRegistry.get('findMe');
    expect(foundAction).toBeDefined();
    expect(foundAction?.definition.name).toBe('findMe');
  });

  test('should return undefined for a non-existent action', () => {
    const foundAction = actionRegistry.get('nonExistent');
    expect(foundAction).toBeUndefined();
  });

  test('should execute a registered action', () => {
    const mockExecute = jest.fn();
    const mockDefinition: ActionDefinition = {
      name: 'executableAction',
      description: 'An executable action',
      params: [{ name: 'param1', type: 'string', description: 'A parameter' }],
    };

    actionRegistry.register(mockDefinition, mockExecute);

    const actionToExecute = actionRegistry.get('executableAction');
    const testParams = { param1: 'hello' };
    actionToExecute?.implementation(mockContext, testParams);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(mockContext, testParams);
  });

  test('should log a warning when registering a duplicate action', () => {
    const definition: ActionDefinition = {
      name: 'duplicateAction',
      description: 'A test action',
      params: [],
    };
    const implementation = jest.fn();

    actionRegistry.register(definition, implementation);
    // 같은 이름으로 다시 등록
    actionRegistry.register(definition, implementation);

    // console.warn이 호출되었는지 확인
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      "[ActionRegistry] Action \"duplicateAction\" is already registered. Overwriting."
    );
  });

  test('should return all action definitions', () => {
    const def1: ActionDefinition = { name: 'action1', description: 'd1', params: [] };
    const def2: ActionDefinition = { name: 'action2', description: 'd2', params: [] };
    const impl = jest.fn();

    actionRegistry.register(def1, impl);
    actionRegistry.register(def2, impl);

    const definitions = actionRegistry.getAllActionDefinitions();
    expect(definitions).toHaveLength(2);
    expect(definitions).toEqual(expect.arrayContaining([def1, def2]));
  });
});
