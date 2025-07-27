import * as THREE from 'three';
import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';
import { VRM } from '@pixiv/three-vrm';

/**
 * A plugin that allows the user to grab and drag the VRM character.
 * The drag action is initiated by clicking and holding the 'hips' hitbox.
 */
export class GrabVrmPlugin implements IPlugin {
  public readonly name = 'GrabVrm';
  public enabled = true;
  
  private context: PluginContext | null = null;
  private isDragging = false;
  private currentVrm: VRM | null = null;

  // Raycasting objects for calculating 3D position from mouse
  private raycaster = new THREE.Raycaster();
  // This plane is perpendicular to the camera and positioned at the character's initial drag point.
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3(); // Distance from the intersection point to the character's center

  // Bound event handlers to maintain `this` context
  private onMouseDownOnPart = this.handleMouseDownOnPart.bind(this);
  private onMouseMove = this.handleMouseMove.bind(this);
  private onMouseUp = this.handleMouseUp.bind(this);

  setPluginContext(context: PluginContext): void {
    this.context = context;
    this.setupEventListeners();
    console.log('[GrabVrmPlugin] Initialized.');
  }

  private setupEventListeners(): void {
    if (!this.context) return;

    // Listen for the initial click on a character part
    this.context.eventBus.on('character_part_clicked', this.onMouseDownOnPart);
    
    // Keep track of the current VRM
    this.context.eventBus.on('vrm:loaded', ({ vrm }) => { this.currentVrm = vrm; });
    this.context.eventBus.on('vrm:unloaded', () => { this.currentVrm = null; });
  }

  private handleMouseDownOnPart({ partName }: { partName: string }): void {
    if (!this.enabled || this.isDragging || !this.currentVrm) return;

    if (partName === 'hips') {
      const camera = (window.vrmManager as any)._camera as THREE.PerspectiveCamera;
      if (!camera) return;

      this.isDragging = true;
      
      // 1. Set up the drag plane
      // The plane is perpendicular to the camera's line of sight
      camera.getWorldDirection(this.dragPlane.normal); 
      // And it passes through the center of the character
      this.dragPlane.setFromNormalAndCoplanarPoint(this.dragPlane.normal, this.currentVrm.scene.position);

      // 2. Calculate the initial intersection point to find the offset
      const mouse = new THREE.Vector2(
        (window.event as MouseEvent).clientX / window.innerWidth * 2 - 1,
        -((window.event as MouseEvent).clientY / window.innerHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(mouse, camera);
      const intersectionPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);
      
      if (intersectionPoint) {
        // This offset is the difference between the model's center and where the ray hit the plane
        this.dragOffset.copy(intersectionPoint).sub(this.currentVrm.scene.position);
      }

      // 3. Add global event listeners
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp, { once: true }); // `once` ensures it's automatically removed

      // 4. Animate to grabbed
      
      this.context.actions.setPose("pose_grabbed.vrma")
      this.context.actions.showMessage("으악!")

      console.log('[GrabVrmPlugin] Started dragging character.');
      
      // Disable orbit controls to prevent camera movement while dragging
      const controls = (window.vrmManager as any)._camera.parent?.children.find((c: any) => c.constructor.name === 'OrbitControls');
      if(controls) controls.enabled = false;
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.currentVrm) return;

    const camera = (window.vrmManager as any)._camera as THREE.PerspectiveCamera;
    if (!camera) return;

    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, camera);
    const intersectionPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);

    if (intersectionPoint) {
      // Subtract the offset to maintain the initial grab point relative to the model's center
      this.currentVrm.scene.position.copy(intersectionPoint.sub(this.dragOffset));
    }
  }

  private handleMouseUp(): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;

    // Animate to Stand
    this.context.actions.setPose("pose_stand_001.vrma")

    document.removeEventListener('mousemove', this.onMouseMove);
    // No need to remove mouseup listener if `once: true` is used, but doesn't hurt to be explicit
    document.removeEventListener('mouseup', this.onMouseUp);

    console.log('[GrabVrmPlugin] Stopped dragging character.');

    // Re-enable orbit controls
    const controls = (window.vrmManager as any)._camera.parent?.children.find((c: any) => c.constructor.name === 'OrbitControls');
    if(controls) controls.enabled = true;
  }

  onEnable(): void {
    // This plugin is enabled by default and controlled by internal state.
  }

  onDisable(): void {
    // If the plugin is disabled mid-drag, ensure we clean up.
    this.handleMouseUp();
  }

  update(deltaTime: number): void {
    // Most logic is event-driven, so update is not needed for this plugin.
  }
}
