// src/core/trigger-engine.test.ts

import { TriggerEngine } from './trigger-engine';
import { Trigger, Context } from '../plugin-api/triggers';

describe('TriggerEngine', () => {
  let engine: TriggerEngine;
  let mockAction: jest.Mock;

  beforeEach(() => {
    engine = new TriggerEngine();
    mockAction = jest.fn();
    // console.error를 모킹하여 예상된 에러 출력을 제어합니다.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should not execute action when condition is false', async () => {
    const trigger: Trigger = {
      name: 'test1',
      condition: () => false,
      action: mockAction,
    };
    engine.registerTrigger(trigger);
    await engine.evaluateTriggers();
    expect(mockAction).not.toHaveBeenCalled();
  });

  test('should execute action when condition is true', async () => {
    const trigger: Trigger = {
      name: 'test2',
      condition: () => true,
      action: mockAction,
    };
    engine.registerTrigger(trigger);
    await engine.evaluateTriggers();
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test('should use context in condition and action', async () => {
    const trigger: Trigger = {
      name: 'contextTest',
      condition: (ctx: any) => ctx.value === 'go',
      action: (ctx: any) => mockAction(ctx.value),
    };
    engine.registerTrigger(trigger);

    // Context에 'value'가 없거나 'go'가 아니면 실행되지 않음
    engine.updateContext({ value: 'stop' } as any);
    await engine.evaluateTriggers();
    expect(mockAction).not.toHaveBeenCalled();

    // Context를 업데이트하면 실행됨
    engine.updateContext({ value: 'go' } as any);
    await engine.evaluateTriggers();
    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(mockAction).toHaveBeenCalledWith('go');
  });

  test('should handle async conditions', async () => {
    const trigger: Trigger = {
      name: 'asyncTest',
      condition: async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return true;
      },
      action: mockAction,
    };
    engine.registerTrigger(trigger);
    await engine.evaluateTriggers();
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test('should handle multiple triggers correctly', async () => {
    const mockAction2 = jest.fn();
    const trigger1: Trigger = { name: 't1', condition: (ctx: any) => ctx.run1, action: mockAction };
    const trigger2: Trigger = { name: 't2', condition: (ctx: any) => ctx.run2, action: mockAction2 };

    engine.registerTrigger(trigger1);
    engine.registerTrigger(trigger2);

    engine.updateContext({ run1: true, run2: false } as any);
    await engine.evaluateTriggers();
    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(mockAction2).not.toHaveBeenCalled();

    engine.updateContext({ run1: false, run2: true } as any);
    await engine.evaluateTriggers();
    expect(mockAction).toHaveBeenCalledTimes(1); // 이전 호출 그대로
    expect(mockAction2).toHaveBeenCalledTimes(1);
  });

  test('should not stop evaluation if one action fails', async () => {
    const failingAction = jest.fn().mockImplementation(() => {
      throw new Error('Action failed');
    });
    const trigger1: Trigger = { name: 'failing', condition: () => true, action: failingAction };
    const trigger2: Trigger = { name: 'successful', condition: () => true, action: mockAction };

    engine.registerTrigger(trigger1);
    engine.registerTrigger(trigger2);

    await engine.evaluateTriggers();

    expect(failingAction).toHaveBeenCalledTimes(1);
    expect(mockAction).toHaveBeenCalledTimes(1); // 실패한 액션과 무관하게 실행되어야 함
    expect(console.error).toHaveBeenCalled(); // 에러가 로그로 기록되었는지 확인
  });
});
