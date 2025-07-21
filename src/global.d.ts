import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';

declare global {
  interface Window {
    vrmExpressionList?: string[];
    currentVrm?: VRM;
    saveVrmPose?: () => { [key: string]: { position: number[]; quaternion: number[]; scale: number[]; } } | null;
    loadVrmPose?: (pose: { [key: string]: { position: number[]; quaternion: number[]; scale: number[]; } }) => void;
    expressionMap?: { [key: string]: string };
    vrmAnimationList?: THREE.AnimationClip[];
    mixer?: THREE.AnimationMixer;
    animateExpression?: (expressionName: string, targetWeight: number, duration: number) => void;
  }
}