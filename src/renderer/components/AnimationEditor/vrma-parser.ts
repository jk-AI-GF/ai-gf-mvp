import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, VRMAnimation, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

// --- Ramer-Douglas-Peucker Algorithm for Keyframe Reduction ---

const TOLERANCE_POSITION = 0.001; // 1mm
const TOLERANCE_QUATERNION_DOT = 0.9999; // Corresponds to a small angle difference

function rdpVector(times: number[], values: number[], valueSize: number, start: number, end: number, outIndices: Set<number>) {
    if (start >= end - 1) return;

    const startTime = times[start];
    const endTime = times[end];
    const startVec = new THREE.Vector3().fromArray(values, start * valueSize);
    const endVec = new THREE.Vector3().fromArray(values, end * valueSize);

    let maxDist = -1;
    let maxDistIndex = -1;

    const line = new THREE.Line3(startVec, endVec);
    const tempVec = new THREE.Vector3();
    const closestPoint = new THREE.Vector3();

    for (let i = start + 1; i < end; i++) {
        const currentVec = tempVec.fromArray(values, i * valueSize);
        line.closestPointToPoint(currentVec, true, closestPoint);
        const dist = currentVec.distanceTo(closestPoint);

        if (dist > maxDist) {
            maxDist = dist;
            maxDistIndex = i;
        }
    }

    if (maxDist > TOLERANCE_POSITION) {
        outIndices.add(maxDistIndex);
        rdpVector(times, values, valueSize, start, maxDistIndex, outIndices);
        rdpVector(times, values, valueSize, maxDistIndex, end, outIndices);
    }
}

function rdpQuaternion(times: number[], values: number[], valueSize: number, start: number, end: number, outIndices: Set<number>) {
    if (start >= end - 1) return;

    const startTime = times[start];
    const endTime = times[end];
    const startQuat = new THREE.Quaternion().fromArray(values, start * valueSize);
    const endQuat = new THREE.Quaternion().fromArray(values, end * valueSize);

    let maxDist = -1;
    let maxDistIndex = -1;

    const tempQuat = new THREE.Quaternion();

    for (let i = start + 1; i < end; i++) {
        const t = (times[i] - startTime) / (endTime - startTime);
        const interpolatedQuat = startQuat.clone().slerp(endQuat, t);
        const currentQuat = tempQuat.fromArray(values, i * valueSize);
        const dist = 1.0 - Math.abs(interpolatedQuat.dot(currentQuat)); // dot product difference

        if (dist > maxDist) {
            maxDist = dist;
            maxDistIndex = i;
        }
    }

    if (maxDist > (1.0 - TOLERANCE_QUATERNION_DOT)) {
        outIndices.add(maxDistIndex);
        rdpQuaternion(times, values, valueSize, start, maxDistIndex, outIndices);
        rdpQuaternion(times, values, valueSize, maxDistIndex, end, outIndices);
    }
}

function optimizeTrack<T extends THREE.KeyframeTrack>(track: T, rdpFunc: Function): T {
    const times = track.times;
    const values = track.values;
    const valueSize = track.getValueSize();

    if (times.length < 3) return track;

    const keptIndices = new Set<number>([0, times.length - 1]);
    rdpFunc(times, values, valueSize, 0, times.length - 1, keptIndices);

    const sortedIndices = Array.from(keptIndices).sort((a, b) => a - b);
    const newTimes = new Float32Array(sortedIndices.length);
    const newValues = new Float32Array(sortedIndices.length * valueSize);

    for (let i = 0; i < sortedIndices.length; i++) {
        const index = sortedIndices[i];
        newTimes[i] = times[index];
        const valueOffset = index * valueSize;
        const newValueOffset = i * valueSize;
        for (let j = 0; j < valueSize; j++) {
            newValues[newValueOffset + j] = values[valueOffset + j];
        }
    }
    
    // @ts-ignore
    return new track.constructor(track.name, newTimes, newValues);
}


/**
 * Parses a VRMA file content (as ArrayBuffer) into a THREE.AnimationClip,
 * ensuring the track names are correctly mapped to the provided VRM model's bone names.
 * 
 * @param arrayBuffer The content of the .vrma file.
 * @param fileName The name of the file, used for the AnimationClip.
 * @param vrm The target VRM model to map bone names against.
 * @returns A Promise that resolves with a THREE.AnimationClip.
 */
export async function parseVrma(arrayBuffer: ArrayBuffer, fileName: string, vrm: VRM): Promise<THREE.AnimationClip> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

  try {
    const gltf = await loader.parseAsync(arrayBuffer, '');
    const vrmAnim = gltf.userData.vrmAnimations?.[0] as VRMAnimation | undefined;

    if (vrmAnim) {
      const clip = createVRMAnimationClip(vrmAnim, vrm);
      
      if (!clip.name) {
        clip.name = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
      }

      const originalKeyframeCount = clip.tracks.reduce((acc, track) => acc + track.times.length, 0);
      
      clip.tracks = clip.tracks.map(track => {
        if (track instanceof THREE.VectorKeyframeTrack) {
          return optimizeTrack(track, rdpVector);
        }
        if (track instanceof THREE.QuaternionKeyframeTrack) {
          return optimizeTrack(track, rdpQuaternion);
        }
        return track;
      });

      const newKeyframeCount = clip.tracks.reduce((acc, track) => acc + track.times.length, 0);
      console.log(`Keyframes reduced from ${originalKeyframeCount} to ${newKeyframeCount} using RDP`);
      
      return clip;
    } else {
      if (gltf.animations && gltf.animations.length > 0) {
        console.warn('VRMA file does not contain VRMAnimation data, falling back to standard GLTF animation. Bone names might not match.');
        const clip = gltf.animations[0].clone();
        return clip;
      }
      throw new Error('파일에 유효한 애니메이션 데이터가 없습니다.');
    }
  } catch (error) {
    console.error('VRMA parsing failed:', error);
    throw new Error(`애니메이션 파일(${fileName})을 파싱하는 데 실패했습니다.`);
  }
}
