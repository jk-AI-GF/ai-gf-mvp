import { VRM } from '@pixiv/three-vrm';
import { ICharacterState } from '../plugin-api/plugin-context';
import { ImageAssetState } from '../plugin-api/asset-types';

// src/core/event-bus.ts
export type LLMResponsePayload =
  | { type: 'talk'; text: string; expression: string }
  | { type: 'action'; subroutine: string; arguments: Record<string, any>; text: string; expression: string }
  | { type: 'action_array'; subroutines: { subroutine: string; arguments: Record<string, any> }[]; text: string; expression: string };

export type AppEvents = {
  /** VRM 로드/해제 */
  'vrm:loaded': { vrm: VRM; expressionNames: string[] };
  'vrm:unloaded': void;
  'vrm:poseApplied': { poseName: string };
  'vrm:animationFinished': { clipName: string };
  'vrm:scaled': { scale: number };

  /** 카메라 */
  'camera:toggleMode': void;
  'camera:modeChanged': 'free' | 'follow';
  'camera:requestState': void;
  'camera:setMode': { mode: 'orbit' | 'fixed' };

  /** UI */
  'ui:editModeToggled': { isEditMode: boolean };

  /** 채팅 및 LLM */
  'chat:newMessage': { role: string, text: string };
  'llm:responseReceived': LLMResponsePayload;
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
  'character:partClicked': { partName: string };
  'character:partRightClicked': { partName: string };
  'character:dragStart': void;
  'character:dragEnd': void;
  'character:grabStart': void;
  'character:grabEnd': void;

  /** 캐릭터 상태 */
  'characterState:changed': ICharacterState;
  'characterState:propertyChanged': { property: keyof Omit<ICharacterState, 'toJSON' | 'hydrate' | 'initialize'>; newValue: any; oldValue: any };

  /** 2D 에셋 */
  'asset:updated': { assets: ImageAssetState[] };

  /** 공통 에러 */
  'error': { scope: string; error: Error };

  /** 시스템 이벤트 */
  'system:mouseIgnoreToggled': boolean;
  'sequence:updated': {
    allSequences: { name: string, type: 'sequence' | 'subroutine' }[],
    activeSequences: string[],
  };
  'sequences:activeListChanged': string[];
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