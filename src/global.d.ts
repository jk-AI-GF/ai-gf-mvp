import { VRM, VRMNormalizedPose } from '@pixiv/three-vrm';
import * as THREE from 'three';

declare global {
  interface Window {
    currentVrm: VRM | null;
    saveVrmPose: () => void;
    loadVrmPose: (pose: VRMNormalizedPose) => void;
    vrmExpressionList: string[];
    expressionMap: { [key: string]: string };
    vrmAnimationList: THREE.AnimationClip[];
    mixer: THREE.AnimationMixer;
    animateExpression: (expressionName: string, targetWeight: number, duration: number) => void;
    playTTS: (text: string) => Promise<void>;
    createJointSliders: () => void;
    loadJsonPose: (jsonPath: string) => Promise<void>;
    loadVrmaPose: (vrmaPath: string) => Promise<void>;
  loadAndPlayAnimation: (animationPath: string) => Promise<void>;
    logVrmBoneNames: () => void;
    createExpressionSliders: () => void;
    electronAPI: {
      listDirectory: (dirPath: string) => Promise<{ files: string[]; directories: string[]; error?: string }>;
      openVrmFile: () => Promise<string | null>;
      saveVrmaPose: (poseData: ArrayBuffer) => Promise<{ success: boolean; message: string }>;
      openVrmaFile: () => Promise<string | null>;
    };
    loadVrmaAnimation: (url: string, isAnimation: boolean) => Promise<void>;
    loadVrmPoseFromFile: (url: string) => Promise<void>;
    loadVrmaFile: (url: string) => Promise<void>;
    setClearColor: (color: number) => void;
  }
}
