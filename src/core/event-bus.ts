import { VRM } from '@pixiv/three-vrm';
import { ICharacterState } from '../plugin-api/plugin-context';

// src/core/event-bus.ts
export type AppEvents = {
  /** VRM 로드/해제 */
  'vrm:loaded': { vrm: VRM; expressionNames: string[] };
  'vrm:unloaded': void;
  'vrm:poseApplied': { poseName: string };
  'vrm:animationFinished': { clipName: string };

  /** 카메라 */
  'camera:toggleMode': void;
  'camera:modeChanged': 'free' | 'follow';
  'camera:requestState': void;
  'camera:setMode': { mode: 'orbit' | 'fixed' };

  /** UI */
  'ui:editModeToggled': { isEditMode: boolean };

  /** 채팅 및 LLM */
  'chat:newMessage': { role: string, text: string };
  'llm:responseReceived': { text: string, expression: string };
  'ui:showFloatingMessage': { text: string; duration?: number };
  'ui:updateFloatingMessagePosition': { left: number; top: number; visible: boolean; };

  /** 플러그인 */
  'plugin:enabled': { pluginName: string };
  'plugin:disabled': { pluginName: string };

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

  /** 캐릭터 상태 */
  'character-state:changed': ICharacterState;
  'character-state:propertyChanged': { property: keyof Omit<ICharacterState, 'toJSON' | 'hydrate' | 'initialize'>; newValue: number; oldValue: number };

  /** 공통 에러 */
  'error': { scope: string; error: Error };

  /** 시스템 이벤트 */
  'system:mouse-ignore-toggle': boolean;
  'sequences-updated': void;
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
    // Do not log high-frequency events to avoid spamming the console
    const silentEvents = ['ui:updateFloatingMessagePosition'];
    if (process.env.NODE_ENV !== 'production' && !silentEvents.includes(String(type))) {
      console.log(`[EventBus] Emit: %c${String(type)}`, 'color: #3498db; font-weight: bold;', args[0] || '');
    }
    const set = map.get(type);
    if (!set) return;
    [...set].forEach(fn => {
      if (args.length === 0) (fn as any)(undefined);
      else (fn as any)(args[0]);
    });
  }

  function clear() { map.clear(); }

  return { on, once, off, emit, clear };
}

const eventBus = createEventBus<AppEvents>();
export default eventBus;