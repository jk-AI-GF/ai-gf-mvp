import * as THREE from 'three';
import { VRM, VRMHumanBoneName, VRMPose } from '@pixiv/three-vrm';

// currentVrm은 renderer.ts에서 전역으로 관리되므로, ui-manager.ts에서는 인자로 받거나,
// window 객체를 통해 접근하도록 변경해야 합니다. 여기서는 일단 인자로 받는 형태로 작성합니다.
// 실제 구현 시에는 window.currentVrm을 사용하거나, 더 나은 의존성 주입 방법을 고려해야 합니다.

















export function logVrmBoneNames(currentVrm: VRM | null) {
  if (!currentVrm) return;
  console.log('--- VRM Humanoid Bone Names ---');
  Object.entries(currentVrm.humanoid.humanBones).forEach(([boneName, bone]) => {
    if (bone?.node) console.log(`HumanBoneName: ${boneName}, Node Name: ${bone.node.name}`);
  });
  console.log('-------------------------------');
}







