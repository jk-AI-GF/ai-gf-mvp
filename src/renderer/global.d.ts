import { VRM, VRMExpression, VRMNormalizedPose } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { moduleManager } from '../modules/module-manager';

declare global {
  interface Window {
    currentVrm: VRM | null;
    saveVrmPose: () => void;
    loadVrmPose: (pose: VRMNormalizedPose) => void;
    vrmExpressionList: string[];
    expressionMap: { [key: string]: VRMExpression };
    vrmAnimationList: THREE.AnimationClip[];
    mixer: THREE.AnimationMixer;
    animateExpression: (expressionName: string, targetWeight: number, duration: number) => void;
    animateExpressionAdditive: (expressionName: string, targetWeight: number, duration: number) => void;
    playTTS: (text: string) => Promise<void>;
    createJointSliders: () => void;
    loadJsonPose: (jsonPath: string) => Promise<void>;
    loadVrmaPose: (vrmaPath: string) => Promise<void>;
    loadAnimationFile: (url: string, options?: { loop?: boolean; crossFadeDuration?: number }) => Promise<void>;
    setClearColor: (color: number) => void;
    floatingMessages: { element: HTMLDivElement; timestamp: number; }[];
    electronAPI: {
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
    };
    logVrmBoneNames: () => void;
    createExpressionSliders: () => void;
    appendMessage: (role: string, text: string) => void;
    sendChatMessage: (message: string) => Promise<void>;
    personaText: string;
    moduleManager: moduleManager;
    createmoduleList: () => void;
    listVrmMeshes: () => string[];
    toggleVrmMeshVisibility: (meshName: string, visible: boolean) => void;
    createMeshList: () => void;
    toggleCameraMode: () => void;
    toggleTts: (enable: boolean) => void;
    setMasterVolume: (volume: number) => void;
  }
}
