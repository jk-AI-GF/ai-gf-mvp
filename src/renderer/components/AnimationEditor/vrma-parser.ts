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
      let clip = gltf.animations[0];
      // 부수 효과를 피하려면 복제
      clip = clip.clone();

      // 중복 키프레임 제거
      clip.optimize();  

      // (옵션) 더 공격적으로 샘플링
      clip.tracks = clip.tracks.map(track => {
        const { times, values } = track;
        const valueSize = track.getValueSize();
        const threshold = 1e-3; // 값 변화 허용 오차
        const newTimes = [];
        const newValues = [];

        for (let i = 0; i < times.length; i++) {
          // 이전 키프레임과 비교하여 값 차이가 크지 않으면 건너뜁니다.
          // (단순화를 위해 첫 번째 컴포넌트만 비교)
          if (i === 0 || Math.abs(values[i * valueSize] - values[(i - 1) * valueSize]) > threshold) {
            newTimes.push(times[i]);
            for (let k = 0; k < valueSize; k++) {
              newValues.push(values[i * valueSize + k]);
            }
          }
        }

        // `setTimes`/`setValues`는 이전 three.js 버전의 API입니다.
        // 현재 버전에서는 생성자를 통해 새로운 KeyframeTrack을 생성해야 합니다.
        // @ts-ignore - track.constructor가 생성자임에도 불구하고 TS가 추론하지 못하는 문제입니다.
        return new track.constructor(track.name, newTimes, newValues);
      });

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
