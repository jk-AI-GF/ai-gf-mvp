import { VRM, VRMExpression, VRMNormalizedPose } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { ModuleManager } from '../modules/module-manager';
import { VRMManager } from './vrm-manager'; // VRMManager import 추가

declare global {
  interface Window {
    // --- Refactored ---
    vrmManager: VRMManager; // vrmManager 추가
    moduleManager: ModuleManager;

    // --- UI Interaction Functions ---
    animateExpression: (expressionName: string, targetWeight: number, duration: number) => void;
    animateExpressionAdditive: (expressionName: string, targetWeight: number, duration: number) => void;
    loadAnimationFile: (url: string, options?: { loop?: boolean; crossFadeDuration?: number }) => Promise<void>;
    appendMessage: (role: string, text: string) => void;
    sendChatMessage: (message: string) => Promise<void>;
    
    // --- UI Creation/Update Functions ---
    updateJointSliders: () => void;
    createJointSliders: () => void;
    createExpressionSliders: () => void;
    createMeshList: () => void;
    createmoduleList: () => void;
    createModList: () => void;
    get3DPointFromMouse: () => THREE.Vector3;

    // --- System & Device Controls ---
    playTTS: (text: string) => Promise<void>;
    setClearColor: (color: number) => void;
    toggleCameraMode: () => void;
    toggleTts: (enable: boolean) => void;
    setMasterVolume: (volume: number) => void;
    
    // --- Data & State ---
    mousePosition: { x: number; y: number };
    floatingMessages: { element: HTMLDivElement; timestamp: number; }[];
    vrmExpressionList: string[];
    expressionMap: { [key: string]: VRMExpression };
    personaText: string;

    // --- VRM specific direct access (should be minimized) ---
    listVrmMeshes: () => string[];
    toggleVrmMeshVisibility: (meshName: string, visible: boolean) => void;
    currentVrm: VRM | null; // Still needed for some modules/UI parts

    // --- Electron API ---
    electronAPI: {
      quitApp: () => void;
      listDirectory: (dirPath: string) => Promise<{ files: string[]; directories: string[]; error?: string }>;
      openVrmFile: () => Promise<string | null>;
      saveVrmaPose: (poseData: ArrayBuffer) => Promise<{ success: boolean; message: string }>;
      openVrmaFile: () => Promise<string | null>;
      savePersonaToFile: (persona: string) => Promise<{ success: boolean; message: string }>;
      openPersonaFile: () => Promise<string | null>;
      readAssetFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;
      readAbsoluteFile: (filePath: string) => Promise<ArrayBuffer | { error: string }>;
      playAnimation: (animationName: string, loop?: boolean, crossFadeDuration?: number) => Promise<void>;
      showMessage: (message: string, duration?: number) => Promise<void>;
      setExpression: (expressionName: string, weight: number, duration?: number) => Promise<void>;
      on: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      // --- Mod Management ---
      getAllMods: () => Promise<{ name: string; version: string; path: string; }[]>;
      getModSettings: () => Promise<Record<string, boolean>>;
      setModEnabled: (modName: string, isEnabled: boolean) => Promise<{ success: boolean }>;
    };
  }
}