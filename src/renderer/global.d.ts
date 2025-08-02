import { VRM, VRMExpression, VRMHumanBoneName, VRMNormalizedPose } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PluginManager } from '../plugins/plugin-manager';
import { VRMManager } from './vrm-manager';
import { PluginContext } from '../plugin-api/plugin-context';
import { CharacterState } from '../core/character-state';
import { TypedEventBus, AppEvents } from '../core/event-bus';
import { LlmSettings } from '../core/llm-settings';
import { CustomTrigger } from '../core/custom-trigger-manager';

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
      // Path API
      getPath: (pathName: 'assets' | 'userData') => Promise<string>;
      resolvePath: (pathName: 'assets' | 'userData', subpath: string) => Promise<string>;
      fileExists: (filePath: string) => Promise<boolean>;

      // App control
      quitApp: () => void;
      toggleMouseIgnore: () => void;

      // File System API
      listDirectory: (dirPath: string, basePath?: 'assets' | 'userData') => Promise<{ files: string[]; directories: string[]; error?: string }>;
      openVrmFile: () => Promise<string | null>;
      saveVrmaPose: (poseData: ArrayBuffer) => Promise<{ success: boolean; message: string }>;
      openVrmaFile: () => Promise<string | null>;
      savePersonaToFile: (persona: string) => Promise<{ success: boolean; message: string }>;
      openPersonaFile: () => Promise<string | null>;
      readAssetFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;
      readAbsoluteFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;
      readFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;

      // Action API
      playAnimation: (animationName: string, loop?: boolean, crossFadeDuration?: number) => Promise<void>;
      showMessage: (message: string, duration?: number) => Promise<void>;
      setExpression: (expressionName: string, weight: number, duration?: number) => Promise<void>;

      // Event Bus
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
      getMouseIgnoreShortcut: () => Promise<string>;
      setMouseIgnoreShortcut: (shortcut: string) => void;

      // --- Mod Management ---
      getAllMods: () => Promise<{ name: string; version: string; path: string; }[]>;
      getModSettings: () => Promise<Record<string, boolean>>;
      setModEnabled: (modName: string, isEnabled: boolean) => Promise<{ success: boolean }>;

      // --- Custom Triggers ---
      getCustomTriggers: () => Promise<CustomTrigger[]>;
      saveCustomTrigger: (trigger: CustomTrigger) => Promise<{ success: boolean; error?: string }>;
      deleteCustomTrigger: (triggerId: string) => Promise<{ success: boolean; error?: string }>;

      // --- Sequence API ---
      saveSequence: (sequenceData: string) => Promise<{ success: boolean; canceled: boolean; filePath?: string; error?: string }>;
      loadSequence: () => Promise<{ success: boolean; canceled: boolean; data?: string; filePath?: string; error?: string }>;
    };
  }
}

export {};
