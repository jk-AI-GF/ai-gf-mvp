
import { EventBus } from '../module-api/event-bus';

// EventBus 인터페이스의 실제 구현체입니다.
export class EventBusImpl implements EventBus {
  private listeners: Map<string, ((payload: any) => void)[]> = new Map();

  emit<T = unknown>(eventName: string, payload?: T): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`[EventBus] Error in listener for event '${eventName}':`, error);
        }
      });
    }
  }

  on<T = unknown>(eventName: string, listener: (payload: T) => void): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)?.push(listener);

    // 구독 해지 함수 반환
    return () => {
      const eventListeners = this.listeners.get(eventName);
      if (eventListeners) {
        const index = eventListeners.indexOf(listener);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    };
  }
}
