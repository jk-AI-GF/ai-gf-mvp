import { IPlugin } from './plugin-manager';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import * as THREE from 'three';

export class LookAtCameraPlugin implements IPlugin {
  public readonly name = 'LookAtCamera';
  public enabled = true;

  private camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  public update(delta: number, vrm: VRM): void {
    if (!vrm.humanoid) return;

    const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
    if (!head) return;

    const headForward = new THREE.Vector3();
    head.getWorldDirection(headForward);
    headForward.negate();

    const camPos = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);

    const headPos = new THREE.Vector3();
    head.getWorldPosition(headPos);

    const cameraDir = new THREE.Vector3().subVectors(camPos, headPos).normalize();

    const lookAtOffset = new THREE.Quaternion().setFromUnitVectors(headForward, cameraDir);
    const headWorldQuat = new THREE.Quaternion();
    head.getWorldQuaternion(headWorldQuat);

    const targetWorldQuat = new THREE.Quaternion().multiplyQuaternions(lookAtOffset, headWorldQuat);

    const parentWorldQuat = new THREE.Quaternion();
    head.parent.getWorldQuaternion(parentWorldQuat);
    const parentWorldQuatInverse = parentWorldQuat.clone().invert();

    const targetLocalQuat = targetWorldQuat.clone().premultiply(parentWorldQuatInverse);

    // Slerp for smooth transition
    head.quaternion.slerp(targetLocalQuat, 0.1);
  }
}
