import * as THREE from 'three';
import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { VRMManager } from '../renderer/vrm-manager';

export class GrabVrmPlugin implements IPlugin {
  public readonly name = 'GrabVrm';
  public enabled = true;
  public runInVrmMode = true;

  private context!: PluginContext;
  private vrmManager!: VRMManager;

  private isDragging = false;
  private raycaster = new THREE.Raycaster();
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();
  private intersection = new THREE.Vector3();
  private partClickedUnsubscribe: (() => void) | null = null;

  // --- Physics properties (all in LOCAL space of the hips bone) ---
  private angularVelocity = new THREE.Vector3();
  private restRotation = new THREE.Quaternion();
  private springConstant = 15; // Increased for a snappier return
  private dampingFactor = 5;   // Increased to handle the stronger spring
  private mouseInfluenceFactor = 0.02; // Increased for more responsive torque from mouse

  constructor() {
    this.handleMouseDownOnPart = this.handleMouseDownOnPart.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  setup(context: PluginContext): void {
    this.context = context;
    this.vrmManager = context.vrmManager;
  }

  onEnable(): void {
    this.partClickedUnsubscribe = this.context.eventBus.on('character:partClicked', this.handleMouseDownOnPart);
  }

  onDisable(): void {
    this.partClickedUnsubscribe?.();
    if (this.isDragging) {
      this.handleMouseUp();
    }
  }

  private async handleMouseDownOnPart({ partName }: { partName: string }): Promise<void> {
    if (!this.enabled || this.isDragging || !this.vrmManager.currentVrm) return;
    const hips = this.vrmManager.currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips);
    const activeCamera = this.vrmManager.activeCamera;

    if (partName === 'hips' && hips && activeCamera) {
      const mouse = new THREE.Vector2(
        ((window.event as MouseEvent).clientX / window.innerWidth) * 2 - 1,
        -((window.event as MouseEvent).clientY / window.innerHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(mouse, activeCamera);
      const intersects = this.raycaster.intersectObjects(this.vrmManager.hitboxes);

      if (intersects.length > 0) {
        this.isDragging = true;
        this.angularVelocity.set(0, 0, 0);
        const clickPoint = intersects[0].point;

        this.dragPlane.setFromNormalAndCoplanarPoint(
          activeCamera.getWorldDirection(this.dragPlane.normal),
          clickPoint
        );
        this.dragOffset.copy(clickPoint).sub(this.vrmManager.currentVrm.scene.position);

        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp, { once: true });

        await this.context.actions['character.setPose']("pose_grabbed.vrma");
        
        // Now that the pose is applied, set the rest rotation in local space
        this.restRotation.copy(hips.quaternion);

        this.context.actions['ui.showMessage']("으악!");
        this.context.eventBus.emit('character:grabStart');

        if (activeCamera instanceof THREE.PerspectiveCamera) {
          const controls = (activeCamera.parent?.children.find((c: any) => c.constructor.name === 'OrbitControls') as any);
          if (controls) controls.enabled = false;
        }
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.vrmManager.currentVrm || !this.vrmManager.activeCamera) return;
    
    const hips = this.vrmManager.currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips);
    if (!hips) return;

    // **FIX: Calculate impulse in world space and transform it to the bone's local space.**
    const camera = this.vrmManager.activeCamera;
    
    // 1. Define impulse axes based on camera orientation
    const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const cameraUp = new THREE.Vector3(0, 1, 0); // Use world up for stable swing

    // 2. Create world-space impulse
    const yawImpulse = cameraUp.multiplyScalar(-event.movementX * this.mouseInfluenceFactor);
    const pitchImpulse = cameraRight.multiplyScalar(event.movementY * this.mouseInfluenceFactor);
    const worldImpulse = yawImpulse.add(pitchImpulse);

    // 3. Transform the world impulse into the local space of the hips bone
    const hipsWorldQuaternion = hips.getWorldQuaternion(new THREE.Quaternion());
    const localImpulse = worldImpulse.clone().applyQuaternion(hipsWorldQuaternion.invert());

    // 4. Add the local impulse to the local angular velocity
    this.angularVelocity.add(localImpulse);

    // Position dragging logic remains the same
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.vrmManager.activeCamera);
    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
      this.vrmManager.currentVrm.scene.position.copy(this.intersection.sub(this.dragOffset));
    }
  }

  private handleMouseUp(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.context.eventBus.emit('character:grabEnd');
    this.context.actions['character.setPose']("pose_stand_001.vrma", 0.2);

    document.removeEventListener('mousemove', this.handleMouseMove);

    const activeCamera = this.vrmManager.activeCamera;
    if (activeCamera instanceof THREE.PerspectiveCamera) {
      const controls = (activeCamera.parent?.children.find((c: any) => c.constructor.name === 'OrbitControls') as any);
      if (controls) controls.enabled = true;
    }
  }

  update(deltaTime: number, vrm: VRM): void {
    if (!this.isDragging) return;

    const hips = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips);
    if (!hips) return;
    
    // 1. Spring force (to return to restRotation)
    // **FIX: Correct quaternion multiplication order for difference.**
    // The difference quaternion that rotates from current to rest is (current^-1 * rest).
    const rotationDifference = hips.quaternion.clone().invert().multiply(this.restRotation);
    const angle = 2 * Math.acos(THREE.MathUtils.clamp(rotationDifference.w, -1, 1));
    let springTorque = new THREE.Vector3();
    if (angle > 0.001) {
      const axis = new THREE.Vector3(rotationDifference.x, rotationDifference.y, rotationDifference.z).normalize();
      springTorque = axis.multiplyScalar(angle * this.springConstant);
    }

    // 2. Damping force (to slow down rotation)
    const dampingForce = this.angularVelocity.clone().multiplyScalar(this.dampingFactor);

    // 3. Update angular velocity
    const totalTorque = springTorque.sub(dampingForce);
    this.angularVelocity.add(totalTorque.multiplyScalar(deltaTime));

    // 4. Apply rotation
    if (this.angularVelocity.lengthSq() > 0) {
      const deltaRotation = new THREE.Quaternion().setFromAxisAngle(
        this.angularVelocity.clone().normalize(),
        this.angularVelocity.length() * deltaTime
      );
      // Apply the local rotation to the local quaternion
      hips.quaternion.multiply(deltaRotation);
    }
  }
}