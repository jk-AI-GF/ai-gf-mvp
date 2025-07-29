import { VRM, VRMExpression, VRMHumanBoneName, VRMNormalizedPose } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PluginManager } from '../plugins/plugin-manager';
import { VRMManager } from './vrm-manager';
import { PluginContext } from '../plugin-api/plugin-context';
import { CharacterState } from '../core/character-state';
import { TypedEventBus, AppEvents } from '../core/event-bus';
import { LlmSettings } from '../core/llm-settings';

declare global {
  interface Window {
    // --- Debug ---
    vrmManager: VRMManager;
    pluginManager: PluginManager;
    pluginContext: PluginContext;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    THREE: typeof THREE;

    // --- Legacy / To be refactored ---
    // These are kept for transitional purposes and should be removed eventually.
    appendMessage: (role: string, text: string) => void;
    sendChatMessage: (message: string) => Promise<void>;
    currentVrm: VRM | null;
    mousePosition: { x: number; y: number };
    setMasterVolume: (volume: number) => void;
    toggleTts: (enable: boolean) => void;
    
    // --- Electron API ---
    electronAPI: {
      quitApp: () => void;
      toggleMouseIgnore: () => void;
      listDirectory: (dirPath: string) => Promise<{ files: string[]; directories: string[]; error?: string }>;
      openVrmFile: () => Promise<string | null>;
      saveVrmaPose: (poseData: ArrayBuffer) => Promise<{ success: boolean; message: string }>;
      openVrmaFile: () => Promise<string | null>;
      savePersonaToFile: (persona: string) => Promise<{ success: boolean; message: string }>;
      openPersonaFile: () => Promise<string | null>;
      readAssetFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;
      readAbsoluteFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;
      readFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;
      playAnimation: (animationName: string, loop?: boolean, crossFadeDuration?: number) => Promise<void>;
      showMessage: (message: string, duration?: number) => Promise<void>;
      setExpression: (expressionName: string, weight: number, duration?: number) => Promise<void>;
      on: (channel: string, listener: (...args: any[]) => void) => () => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      // --- Settings ---
      setWindowOpacity: (opacity: number) => void;
      getWindowOpacity: () => Promise<number>;
      setPersona: (persona: string) => void;
      getPersona: () => Promise<string>;
      getLlmSettings: () => Promise<LlmSettings>;
      setLlmSettings: (settings: LlmSettings) => void;
      // --- Mod Management ---
      getAllMods: () => Promise<{ name: string; version: string; path: string; }[]>;
      getModSettings: () => Promise<Record<string, boolean>>;
      setModEnabled: (modName: string, isEnabled: boolean) => Promise<{ success: boolean }>;
    };
  }
}

export {};
