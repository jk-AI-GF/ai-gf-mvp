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

/**
 * Serializes a THREE.AnimationClip into a VRMA (binary glTF) ArrayBuffer.
 * @param clip The AnimationClip to serialize.
 * @param vrm The VRM model used as a reference for bone names.
 * @returns A Promise that resolves with an ArrayBuffer of the .vrma file.
 */
export async function serializeVrma(clip: THREE.AnimationClip, vrm: VRM): Promise<ArrayBuffer> {
  const boneNameMap = new Map<string, string>();
  Object.entries(vrm.humanoid.humanBones).forEach(([humanBoneName, { node }]) => {
    boneNameMap.set(node.name, humanBoneName);
  });

  const vrmAnimation: VRMAnimation = {
    humanoid: { humanBones: {} },
    expressions: { preset: {}, custom: {} },
    lookAt: undefined,
  };

  const bufferViews: any[] = [];
  const accessors: any[] = [];
  const samplers: any[] = [];
  const channels: any[] = [];
  const binaryChunks: ArrayBuffer[] = [];
  let byteOffset = 0;

  clip.tracks.forEach(track => {
    const trackNameParts = track.name.split('.');
    const nodeName = trackNameParts[0];
    const propertyName = trackNameParts[1];

    const humanBoneName = boneNameMap.get(nodeName) as any;
    if (!humanBoneName) {
      console.warn(`Skipping track for non-humanoid bone: ${nodeName}`);
      return;
    }

    // Create Buffer and BufferView for times
    const times = track.times as Float32Array;
    const timeBuffer = times.buffer.slice(times.byteOffset, times.byteOffset + times.byteLength);
    const timeBufferViewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: byteOffset,
      byteLength: timeBuffer.byteLength,
    });
    binaryChunks.push(timeBuffer);
    byteOffset += timeBuffer.byteLength;

    // Create Accessor for times
    const timeAccessorIndex = accessors.length;
    accessors.push({
      bufferView: timeBufferViewIndex,
      componentType: 5126, // FLOAT
      count: times.length,
      type: 'SCALAR',
      max: [Math.max(...times)],
      min: [Math.min(...times)],
    });

    // Create Buffer and BufferView for values
    const values = track.values as Float32Array;
    const valueBuffer = values.buffer.slice(values.byteOffset, values.byteOffset + values.byteLength);
    const valueBufferViewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: byteOffset,
      byteLength: valueBuffer.byteLength,
    });
    binaryChunks.push(valueBuffer);
    byteOffset += valueBuffer.byteLength;

    // Create Accessor for values
    const valueAccessorIndex = accessors.length;
    let valueType: 'VEC3' | 'VEC4' = 'VEC3';
    if (propertyName === 'quaternion') {
      valueType = 'VEC4';
    }
    accessors.push({
      bufferView: valueBufferViewIndex,
      componentType: 5126, // FLOAT
      count: values.length / track.getValueSize(),
      type: valueType,
    });

    // Create Sampler
    const samplerIndex = samplers.length;
    samplers.push({
      input: timeAccessorIndex,
      output: valueAccessorIndex,
      interpolation: 'LINEAR',
    });

    // Create Channel and link to VRMAnimation
    if (!vrmAnimation.humanoid.humanBones[humanBoneName]) {
      vrmAnimation.humanoid.humanBones[humanBoneName] = { node: 0 }; // Placeholder node index
    }

    const channelTarget = {
      node: 0, // Placeholder node index
      path: propertyName,
    };
    
    if (propertyName === 'position') {
      vrmAnimation.humanoid.humanBones[humanBoneName].translation = samplerIndex;
    } else if (propertyName === 'quaternion') {
      vrmAnimation.humanoid.humanBones[humanBoneName].rotation = samplerIndex;
    }
    
    channels.push({
        sampler: samplerIndex,
        target: channelTarget,
    });
  });

  const totalByteLength = byteOffset;
  const binaryBuffer = new Uint8Array(totalByteLength);
  let currentOffset = 0;
  for (const chunk of binaryChunks) {
    binaryBuffer.set(new Uint8Array(chunk), currentOffset);
    currentOffset += chunk.byteLength;
  }

  const json = {
    asset: { version: '2.0', generator: 'AI-GF Animation Editor' },
    animations: [{ name: clip.name, channels, samplers }],
    extensions: { VRMC_vrm_animation: vrmAnimation },
    extensionsUsed: ['VRMC_vrm_animation'],
    accessors,
    bufferViews,
    buffers: [{ byteLength: totalByteLength }],
    nodes: [{name: "AnimationNode"}], // Add a dummy node
    scenes: [{nodes: [0]}],
  };

  const jsonString = JSON.stringify(json);
  const jsonBuffer = new TextEncoder().encode(jsonString);

  const JSON_CHUNK_TYPE = 0x4e4f534a;
  const BIN_CHUNK_TYPE = 0x004e4942;
  const GLB_HEADER_MAGIC = 0x46546c67;
  const GLB_HEADER_LENGTH = 12;
  const GLB_CHUNK_HEADER_LENGTH = 8;

  const jsonChunkLength = Math.ceil(jsonBuffer.length / 4) * 4;
  const binChunkLength = Math.ceil(binaryBuffer.length / 4) * 4;

  const totalGBLength = GLB_HEADER_LENGTH + GLB_CHUNK_HEADER_LENGTH + jsonChunkLength + GLB_CHUNK_HEADER_LENGTH + binChunkLength;
  const glbBuffer = new ArrayBuffer(totalGBLength);
  const dataView = new DataView(glbBuffer);

  let pos = 0;
  dataView.setUint32(pos, GLB_HEADER_MAGIC, true); pos += 4;
  dataView.setUint32(pos, 2, true); pos += 4; // version
  dataView.setUint32(pos, totalGBLength, true); pos += 4;

  dataView.setUint32(pos, jsonChunkLength, true); pos += 4;
  dataView.setUint32(pos, JSON_CHUNK_TYPE, true); pos += 4;
  new Uint8Array(glbBuffer, pos).set(jsonBuffer);
  pos += jsonChunkLength;

  dataView.setUint32(pos, binChunkLength, true); pos += 4;
  dataView.setUint32(pos, BIN_CHUNK_TYPE, true); pos += 4;
  new Uint8Array(glbBuffer, pos).set(binaryBuffer);

  return glbBuffer;
}
