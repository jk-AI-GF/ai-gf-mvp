import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, VRMAnimation, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

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
      // Use the official library function to create the clip.
      // This correctly handles the mapping of standard bone names to the specific model's bone names.
      const clip = createVRMAnimationClip(vrmAnim, vrm);
      
      // Ensure the clip has a name
      if (!clip.name) {
        clip.name = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
      }

      // Optional: Optimize the clip to remove redundant keyframes
      clip.optimize();
      
      return clip;
    } else {
      // Fallback for older/non-standard VRMA files that might just contain a regular AnimationClip
      if (gltf.animations && gltf.animations.length > 0) {
        console.warn('VRMA file does not contain VRMAnimation data, falling back to standard GLTF animation. Bone names might not match.');
        const clip = gltf.animations[0].clone();
        clip.optimize();
        return clip;
      }
      throw new Error('파일에 유효한 애니메이션 데이터가 없습니다.');
    }
  } catch (error) {
    console.error('VRMA parsing failed:', error);
    throw new Error(`애니메이션 파일(${fileName})을 파싱하는 데 실패했습니다.`);
  }
}
