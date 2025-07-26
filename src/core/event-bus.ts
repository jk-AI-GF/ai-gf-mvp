import { VRM } from '@pixiv/three-vrm';

// src/core/event-bus.ts
export type AppEvents = {
  /** VRM 로드/해제 */
  'vrm:loaded': { vrm: VRM };
  'vrm:unloaded': void;

  /** 액션/애니메이션 */
  'action:play-expression': { name: string; weight: number; fadeIn?: number; duration?: number };
  'action:play-clip': { clip: string };

  /** 씬/루프 */
  'scene:tick': { dt: number; time: number };
  'scene:resize': { width: number; height: number };
  'scene:ready': void;

  /** IPC 브리지 예시 */
  'ipc:play-animation': { clip: string };

  /** 캐릭터 상호작용 */
  'character_part_clicked': { partName: string };
  'character_part_right_clicked': { partName: string };

  /** 공통 에러 */
  'error': { scope: string; error: Error };
};

type Handler<T> = (payload: T) => void;

export interface TypedEventBus<E extends Record<string, any>> {
  on<K extends keyof E>(type: K, handler: Handler<E[K]>): () => void;
  once<K extends keyof E>(type: K, handler: Handler<E[K]>): () => void;
  off<K extends keyof E>(type: K, handler: Handler<E[K]>): void;
  emit<K extends keyof E>(type: K, ...args: E[K] extends void ? [] : [E[K]]): void;
  clear(): void;
}

export function createEventBus<E extends Record<string, any>>(): TypedEventBus<E> {
  const map = new Map<keyof E, Set<Function>>();

  function on<K extends keyof E>(type: K, handler: Handler<E[K]>): () => void {
    const set = map.get(type) ?? new Set();
    set.add(handler);
    map.set(type, set);
    return () => off(type, handler);
  }

  function once<K extends keyof E>(type: K, handler: Handler<E[K]>): () => void {
    const offOnce = on(type, (p: any) => {
      offOnce();
      (handler as any)(p);
    });
    return offOnce;
  }

  function off<K extends keyof E>(type: K, handler: Handler<E[K]>): void {
    const set = map.get(type);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) map.delete(type);
  }

  function emit<K extends keyof E>(type: K, ...args: any[]): void {
    // --- START: Logging/Debugging Enhancement ---
    // In development mode, log the event type and its payload to the console.
    // This is useful for tracing the event flow during development.
    // The `process.env.NODE_ENV` is managed by Webpack and will be 'production'
    // for production builds, automatically disabling these logs.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EventBus] Emit: %c${String(type)}`, 'color: #3498db; font-weight: bold;', args[0] || '');
    }
    // --- END: Logging/Debugging Enhancement ---

    const set = map.get(type);
    if (!set) return;
    // 복사본으로 순회(리스너 내부 off/once 안전)
    [...set].forEach(fn => {
      if (args.length === 0) (fn as any)(undefined);
      else (fn as any)(args[0]);
    });
  }

  function clear() { map.clear(); }

  return { on, once, off, emit, clear };
}
