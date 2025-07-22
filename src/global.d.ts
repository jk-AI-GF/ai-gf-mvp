import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';

declare global {
  interface Window {
    currentVrm: VRM | null;
    saveVrmPose: () => { [key: string]: { position: number[]; quaternion: number[]; scale: number[]; } } | null;
    loadVrmPose: (pose: { [key: string]: { position: number[]; quaternion: number[]; scale: number[]; } }) => void;
    vrmExpressionList: string[];
    expressionMap: { [key: string]: string };
    vrmAnimationList: THREE.AnimationClip[];
    mixer: THREE.AnimationMixer;
    animateExpression: (expressionName: string, targetWeight: number, duration: number) => void;
    playTTS: (text: string) => Promise<void>;
    createJointSliders: () => void;
  }
}