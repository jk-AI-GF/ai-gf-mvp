import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

/**
 * Parses a VRMA file content (as ArrayBuffer) into a THREE.AnimationClip.
 * This function handles both binary (glTF) and JSON-based VRMA formats.
 * 
 * @param arrayBuffer The content of the .vrma file.
 * @param fileName The name of the file, used for the AnimationClip.
 * @returns A Promise that resolves with a THREE.AnimationClip.
 */
export async function parseVrma(arrayBuffer: ArrayBuffer, fileName: string): Promise<THREE.AnimationClip> {
  const loader = new GLTFLoader();
  
  // Attempt to decode as text to check for JSON
  const textDecoder = new TextDecoder('utf-8');
  const textContent = textDecoder.decode(arrayBuffer);

  // Heuristic to detect if it's a JSON-based VRMA
  if (textContent.trim().startsWith('{')) {
    try {
      const jsonData = JSON.parse(textContent);
      // TODO: Implement the logic to parse the JSON structure into an AnimationClip.
      // For now, we'll throw an error indicating it's not yet supported.
      console.log("JSON-based VRMA detected:", jsonData);
      throw new Error('JSON 기반 VRMA 파일의 편집은 아직 지원되지 않습니다.');
    } catch (e) {
      throw new Error('파일이 JSON 형식이지만 파싱에 실패했습니다.');
    }
  }

  // If not JSON, assume it's a binary glTF
  try {
    const gltf = await loader.parseAsync(arrayBuffer, '');
    if (gltf.animations && gltf.animations.length > 0) {
      const clip = gltf.animations[0];
      // Ensure the clip has a name
      if (!clip.name) {
        clip.name = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
      }
      return clip;
    } else {
      throw new Error('파일에 애니메이션 데이터가 없습니다.');
    }
  } catch (error) {
    console.error('GLTF parsing failed:', error);
    throw new Error('바이너리 애니메이션 파일을 파싱하는 데 실패했습니다.');
  }
}
