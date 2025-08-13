import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
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
 * Serializes a THREE.AnimationClip into a VRMA (binary glTF) ArrayBuffer,
 * following the correct structure where the VRM extension maps to standard glTF animation nodes.
 * @param clip The AnimationClip to serialize.
 * @param vrm The VRM model used as a reference for bone names.
 * @returns A Promise that resolves with an ArrayBuffer of the .vrma file.
 */
export async function serializeVrma(clip: THREE.AnimationClip, vrm: VRM): Promise<ArrayBuffer> {
  const normalizedNameToHumanBoneName: { [key: string]: VRMHumanBoneName } = {
    "Normalized_Hips": "hips", "Normalized_Spine": "spine", "Normalized_Chest": "chest",
    "Normalized_UpperChest": "upperChest", "Normalized_Neck": "neck", "Normalized_Head": "head",
    "Normalized_LeftEye": "leftEye", "Normalized_RightEye": "rightEye",
    "Normalized_LeftShoulder": "leftShoulder", "Normalized_LeftArm": "leftUpperArm",
    "Normalized_LeftForeArm": "leftLowerArm", "Normalized_LeftHand": "leftHand",
    "Normalized_RightShoulder": "rightShoulder", "Normalized_RightArm": "rightUpperArm",
    "Normalized_RightForeArm": "rightLowerArm", "Normalized_RightHand": "rightHand",
    "Normalized_LeftUpLeg": "leftUpperLeg", "Normalized_LeftLeg": "leftLowerLeg",
    "Normalized_LeftFoot": "leftFoot", "Normalized_LeftToes": "leftToes",
    "Normalized_RightUpLeg": "rightUpperLeg", "Normalized_RightLeg": "rightLowerLeg",
    "Normalized_RightFoot": "rightFoot", "Normalized_RightToes": "rightToes",
    "Normalized_LeftHandIndex1": "leftIndexProximal", "Normalized_LeftHandIndex2": "leftIndexIntermediate", "Normalized_LeftHandIndex3": "leftIndexDistal",
    "Normalized_LeftHandLittle1": "leftLittleProximal", "Normalized_LeftHandLittle2": "leftLittleIntermediate", "Normalized_LeftHandLittle3": "leftLittleDistal",
    "Normalized_LeftHandMiddle1": "leftMiddleProximal", "Normalized_LeftHandMiddle2": "leftMiddleIntermediate", "Normalized_LeftHandMiddle3": "leftMiddleDistal",
    "Normalized_LeftHandRing1": "leftRingProximal", "Normalized_LeftHandRing2": "leftRingIntermediate", "Normalized_LeftHandRing3": "leftRingDistal",
    "Normalized_LeftHandThumb1": "leftThumbMetacarpal", "Normalized_LeftHandThumb2": "leftThumbProximal", "Normalized_LeftHandThumb3": "leftThumbDistal",
    "Normalized_RightHandIndex1": "rightIndexProximal", "Normalized_RightHandIndex2": "rightIndexIntermediate", "Normalized_RightHandIndex3": "rightIndexDistal",
    "Normalized_RightHandLittle1": "rightLittleProximal", "Normalized_RightHandLittle2": "rightLittleIntermediate", "Normalized_RightHandLittle3": "rightLittleDistal",
    "Normalized_RightHandMiddle1": "rightMiddleProximal", "Normalized_RightHandMiddle2": "rightMiddleIntermediate", "Normalized_RightHandMiddle3": "rightMiddleDistal",
    "Normalized_RightHandRing1": "rightRingProximal", "Normalized_RightHandRing2": "rightRingIntermediate", "Normalized_RightHandRing3": "rightRingDistal",
    "Normalized_RightHandThumb1": "rightThumbMetacarpal", "Normalized_RightHandThumb2": "rightThumbProximal", "Normalized_RightHandThumb3": "rightThumbDistal",
  };

  const bufferViews: any[] = [];
  const accessors: any[] = [];
  const samplers: any[] = [];
  const channels: any[] = [];
  const nodes: any[] = [];
  const binaryChunks: Uint8Array[] = [];
  let totalByteOffset = 0;

  const humanBoneToNodeIndex = new Map<VRMHumanBoneName, number>();

  const animatedBones = new Set<VRMHumanBoneName>();
  for (const track of clip.tracks) {
    if (track.times.length === 0) continue;
    const nodeName = track.name.split('.')[0];
    const humanBoneName = normalizedNameToHumanBoneName[nodeName];
    if (humanBoneName) {
      animatedBones.add(humanBoneName);
    }
  }

  const rootNodes: any[] = [];
  const allVrmNodes = new Map<THREE.Object3D, number>();

  for (const boneName of animatedBones) {
    const boneNode = vrm.humanoid.getRawBoneNode(boneName);
    if (boneNode && !allVrmNodes.has(boneNode)) {
      const nodeIndex = nodes.length;
      allVrmNodes.set(boneNode, nodeIndex);
      humanBoneToNodeIndex.set(boneName, nodeIndex);
      nodes.push({ name: boneName });
    }
  }

  for (const [boneNode, nodeIndex] of allVrmNodes.entries()) {
    if (boneNode.parent && allVrmNodes.has(boneNode.parent)) {
      const parentNodeIndex = allVrmNodes.get(boneNode.parent)!;
      const parentGltfNode = nodes[parentNodeIndex];
      if (!parentGltfNode.children) {
        parentGltfNode.children = [];
      }
      parentGltfNode.children.push(nodeIndex);
    } else {
      rootNodes.push(nodeIndex);
    }
  }

  for (const track of clip.tracks) {
    const propertyName = track.name.split('.')[1];
    const valueComponentCount = propertyName === 'position' ? 3 : 4;

    // VALIDATION 1: Skip empty tracks
    if (track.times.length === 0) continue;

    // VALIDATION 2: Skip if times and values lengths don't match
    if (track.times.length * valueComponentCount !== track.values.length) {
      console.warn(`Skipping track "${track.name}" due to mismatched times/values length.`);
      continue;
    }

    const nodeName = track.name.split('.')[0];
    const humanBoneName = normalizedNameToHumanBoneName[nodeName];

    if (!humanBoneName || !humanBoneToNodeIndex.has(humanBoneName)) {
      continue;
    }
    const nodeIndex = humanBoneToNodeIndex.get(humanBoneName)!;

    // VALIDATION 3: Sanitize data for NaN/Infinity
    for(let i = 0; i < track.times.length; i++) {
        if (!isFinite(track.times[i])) track.times[i] = 0;
    }
    for(let i = 0; i < track.values.length; i++) {
        if (!isFinite(track.values[i])) track.values[i] = 0;
    }

    // --- Process Times ---
    const times = track.times;
    const timeBuffer = new Uint8Array(times.buffer, times.byteOffset, times.byteLength);
    let timePadding = (4 - (timeBuffer.byteLength % 4)) % 4;
    
    const timeBufferViewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: totalByteOffset, byteLength: timeBuffer.byteLength });
    binaryChunks.push(timeBuffer);
    totalByteOffset += timeBuffer.byteLength;
    
    if (timePadding > 0) {
        binaryChunks.push(new Uint8Array(timePadding));
        totalByteOffset += timePadding;
    }

    const timeAccessorIndex = accessors.length;
    accessors.push({
      bufferView: timeBufferViewIndex, componentType: 5126, count: times.length,
      type: 'SCALAR', max: [Math.max(...times)], min: [Math.min(...times)],
    });

    // --- Process Values ---
    const values = track.values;
    const valueBuffer = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
    let valuePadding = (4 - (valueBuffer.byteLength % 4)) % 4;

    const valueBufferViewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: totalByteOffset, byteLength: valueBuffer.byteLength });
    binaryChunks.push(valueBuffer);
    totalByteOffset += valueBuffer.byteLength;

    if (valuePadding > 0) {
        binaryChunks.push(new Uint8Array(valuePadding));
        totalByteOffset += valuePadding;
    }

    const valueAccessorIndex = accessors.length;
    accessors.push({
      bufferView: valueBufferViewIndex, componentType: 5126,
      count: values.length / valueComponentCount, type: propertyName === 'position' ? 'VEC3' : 'VEC4',
    });

    const samplerIndex = samplers.length;
    samplers.push({ input: timeAccessorIndex, output: valueAccessorIndex, interpolation: 'LINEAR' });

    const path = propertyName === 'position' ? 'translation' : 'rotation';
    channels.push({
      sampler: samplerIndex,
      target: { node: nodeIndex, path: path },
    });
  }

  if (channels.length === 0) {
    console.error("serializeVrma: No valid animation tracks were found to serialize.");
    return new ArrayBuffer(0);
  }

  const vrmExtHumanoidBones: { [name in VRMHumanBoneName]?: { node: number } } = {};
  for (const [humanBoneName, nodeIndex] of humanBoneToNodeIndex.entries()) {
    vrmExtHumanoidBones[humanBoneName] = { node: nodeIndex };
  }

  const gltfJson = {
    asset: { version: '2.0', generator: 'AI-GF MVP' },
    extensionsUsed: ['VRMC_vrm_animation'],
    extensionsRequired: ['VRMC_vrm_animation'],
    scenes: [{ nodes: rootNodes }],
    nodes,
    animations: [{ name: clip.name || 'animation', channels, samplers }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: totalByteOffset }],
    extensions: {
      VRMC_vrm_animation: {
        humanoid: { humanBones: vrmExtHumanoidBones },
      },
    },
  };

  const jsonString = JSON.stringify(gltfJson);
  const jsonBuffer = new TextEncoder().encode(jsonString);
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  
  // The total length of the binary chunk is already aligned
  const totalLength = 12 + 8 + jsonBuffer.length + jsonPadding + (totalByteOffset > 0 ? (8 + totalByteOffset) : 0);
  const finalBuffer = new ArrayBuffer(totalLength);
  const dataView = new DataView(finalBuffer);
  let pos = 0;

  dataView.setUint32(pos, 0x46546C67, true); pos += 4;
  dataView.setUint32(pos, 2, true); pos += 4;
  dataView.setUint32(pos, totalLength, true); pos += 4;

  dataView.setUint32(pos, jsonBuffer.length + jsonPadding, true); pos += 4;
  dataView.setUint32(pos, 0x4E4F534A, true); pos += 4;
  new Uint8Array(finalBuffer, pos).set(jsonBuffer);
  pos += jsonBuffer.length;
  for (let i = 0; i < jsonPadding; i++) dataView.setUint8(pos + i, 0x20);
  pos += jsonPadding;

  if (totalByteOffset > 0) {
    dataView.setUint32(pos, totalByteOffset, true); pos += 4;
    dataView.setUint32(pos, 0x004E4942, true); pos += 4;
    let bufferPos = 0;
    for (const chunk of binaryChunks) {
      new Uint8Array(finalBuffer, pos + bufferPos).set(chunk);
      bufferPos += chunk.byteLength;
    }
  }

  return finalBuffer;
}
