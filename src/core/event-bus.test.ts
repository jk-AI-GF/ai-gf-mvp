// src/core/event-bus.test.ts

import eventBus from './event-bus';

// EventBus는 싱글턴이므로, 리스너를 수동으로 관리하기 위한 헬퍼
const managedListeners: (() => void)[] = [];
const manage = (unsubscribe: () => void) => {
  managedListeners.push(unsubscribe);
};

describe('EventBus', () => {
  // 각 테스트 후 모든 리스너 구독 취소
  afterEach(() => {
    while (managedListeners.length) {
      managedListeners.pop()?.();
    }
  });

  test('should subscribe to an event and receive data', () => {
    const mockListener = jest.fn();
    const event = 'chat:newMessage' as const;
    const payload = { role: 'user', text: 'hello' };

    manage(eventBus.on(event, mockListener));
    eventBus.emit(event, payload);

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith(payload);
  });

  test('should handle multiple subscribers for the same event', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    const event = 'vrm:loaded' as const;
    const payload = { vrm: {} as any, expressionNames: [] as string[] };

    manage(eventBus.on(event, listener1));
    manage(eventBus.on(event, listener2));
    eventBus.emit(event, payload);

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  test('should unsubscribe from an event', () => {
    const mockListener = jest.fn();
    const event = 'ui:editModeToggled' as const;
    const payload = { isEditMode: true };

    const unsubscribe = eventBus.on(event, mockListener);
    
    unsubscribe(); // 구독 해제

    eventBus.emit(event, payload);

    expect(mockListener).not.toHaveBeenCalled();
  });

  test('should not affect other events when unsubscribing', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    const event1 = 'plugin:enabled' as const;
    const event2 = 'plugin:disabled' as const;

    const unsubscribe1 = eventBus.on(event1, listener1);
    manage(eventBus.on(event2, listener2));

    unsubscribe1();

    eventBus.emit(event1, { pluginName: 'test' });
    eventBus.emit(event2, { pluginName: 'test' });

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  test('should handle events with no payload', () => {
    const mockListener = jest.fn();
    const event = 'vrm:unloaded' as const;

    manage(eventBus.on(event, mockListener));
    eventBus.emit(event);

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith(undefined);
  });
});

