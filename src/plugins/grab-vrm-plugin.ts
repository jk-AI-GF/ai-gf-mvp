import * as THREE from 'three';
import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';
import { VRM } from '@pixiv/three-vrm';
import { VRMManager } from '../renderer/vrm-manager';

export class GrabVrmPlugin implements IPlugin {
  public readonly name = 'GrabVrm';
  public enabled = true; 
  public runInEditMode = true; // This plugin should run in edit mode

  private context!: PluginContext;
  private vrmManager!: VRMManager;

  private isDragging = false;
  private raycaster = new THREE.Raycaster();
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();
  private intersection = new THREE.Vector3();
  private partClickedUnsubscribe: (() => void) | null = null;

  constructor() {
    this.handleMouseDownOnPart = this.handleMouseDownOnPart.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  setup(context: PluginContext): void {
    this.context = context;
    if (!context.vrmManager) {
      console.error('[GrabVrmPlugin] VRMManager not found in context.');
      return;
    }
    this.vrmManager = context.vrmManager;
    console.log('[GrabVrmPlugin] Setup complete.');
  }

  onEnable(): void {
    console.log('[GrabVrmPlugin] Enabled.');
    this.partClickedUnsubscribe = this.context.eventBus.on('character_part_clicked', this.handleMouseDownOnPart);
  }

  onDisable(): void {
    console.log('[GrabVrmPlugin] Disabled.');
    this.partClickedUnsubscribe?.();
    // Ensure dragging state is reset if disabled mid-drag
    if (this.isDragging) {
      this.handleMouseUp();
    }
  }

  private handleMouseDownOnPart({ partName }: { partName: string }): void {
    // General checks first
    if (!this.enabled || this.isDragging || !this.vrmManager.currentVrm) return;

    if (partName === 'hips') {
      // Camera-dependent checks and logic are moved inside here
      const activeCamera = this.vrmManager.activeCamera;
      if (!activeCamera) {
        console.error("[GrabVrmPlugin] Cannot start drag: Active camera is not available at the moment of click.");
        return;
      }

      const mouse = new THREE.Vector2(
        ((window.event as MouseEvent).clientX / window.innerWidth) * 2 - 1,
        -((window.event as MouseEvent).clientY / window.innerHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(mouse, activeCamera);

      // Intersect with the actual hitboxes to find the precise click point.
      const intersects = this.raycaster.intersectObjects(this.vrmManager.hitboxes);

      if (intersects.length > 0) {
        this.isDragging = true;
        const clickPoint = intersects[0].point; // This is the actual 3D point on the hips.

        // Create the drag plane at the depth of the actual click point.
        this.dragPlane.setFromNormalAndCoplanarPoint(
          activeCamera.getWorldDirection(this.dragPlane.normal),
          clickPoint
        );

        // Calculate the offset from the character's origin to the precise click point.
        this.dragOffset.copy(clickPoint).sub(this.vrmManager.currentVrm.scene.position);

        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp, { once: true });

        this.context.actions.setPose("pose_grabbed.vrma");
        this.context.actions.showMessage("으악!");

        console.log('[GrabVrmPlugin] Started dragging character.');
        
        if (activeCamera instanceof THREE.PerspectiveCamera) {
          const controls = (activeCamera.parent?.children.find((c: any) => c.constructor.name === 'OrbitControls') as any);
          if (controls) controls.enabled = false;
        }
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.vrmManager.currentVrm || !this.vrmManager.activeCamera) return;

    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.vrmManager.activeCamera);

    // This logic works for both Perspective and Orthographic cameras.
    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
        this.vrmManager.currentVrm.scene.position.copy(this.intersection.sub(this.dragOffset));
    }
  }

  private handleMouseUp(): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;

    this.context.actions.setPose("pose_stand_001.vrma");

    document.removeEventListener('mousemove', this.handleMouseMove);
    // 'mouseup' is registered with { once: true }, so it removes itself.

    console.log('[GrabVrmPlugin] Stopped dragging character.');

    const activeCamera = this.vrmManager.activeCamera;
    if (activeCamera instanceof THREE.PerspectiveCamera) {
        const controls = (activeCamera.parent?.children.find((c: any) => c.constructor.name === 'OrbitControls') as any);
        if (controls) controls.enabled = true;
    }
  }

  update(deltaTime: number, vrm: VRM): void {
    // All logic is event-driven
  }
}