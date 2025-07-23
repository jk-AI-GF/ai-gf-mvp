import { VRM, VRMNormalizedPose } from '@pixiv/three-vrm';
import * as THREE from 'three';

declare global {
  interface Window {
    currentVrm: VRM | null;
    saveVrmPose: () => VRMNormalizedPose | null;
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
    electronAPI: {
      listDirectory: (dirPath: string) => Promise<{ files: string[]; directories: string[]; error?: string }>;
    };
  }
}
