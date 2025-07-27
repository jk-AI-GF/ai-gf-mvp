import * as THREE from 'three';
import { IPlugin, PluginManager } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';
import { VRM } from '@pixiv/three-vrm';
import { VRMManager } from '../renderer/vrm-manager';

/**
 * A plugin that allows the user to grab and drag the VRM character.
 * The drag action is initiated by clicking and holding the 'hips' hitbox.
 */
export class GrabVrmPlugin implements IPlugin {
  public readonly name = 'GrabVrm';
  public enabled = true; // Enable by default
  
  private context!: PluginContext;
  private vrmManager!: VRMManager;
  private camera!: THREE.PerspectiveCamera;

  private isDragging = false;
  
  private raycaster = new THREE.Raycaster();
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();

  constructor() {
    // Bind methods to ensure `this` is correct when they are used as event handlers
    this.handleMouseDownOnPart = this.handleMouseDownOnPart.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  setup(context: PluginContext, pluginManager: PluginManager): void {
    this.context = context;
    this.vrmManager = context.vrmManager;
    // A bit of a hack to get the private camera, a public getter would be better
    this.camera = (this.vrmManager as any)._camera; 

    this.context.eventBus.on('character_part_clicked', this.handleMouseDownOnPart);
    
    console.log('[GrabVrmPlugin] Initialized.');
  }

  private handleMouseDownOnPart({ partName }: { partName: string }): void {
    if (!this.enabled || this.isDragging || !this.vrmManager.currentVrm) return;

    if (partName === 'hips') {
      this.isDragging = true;
      
      this.camera.getWorldDirection(this.dragPlane.normal); 
      this.dragPlane.setFromNormalAndCoplanarPoint(this.dragPlane.normal, this.vrmManager.currentVrm.scene.position);

      const mouse = new THREE.Vector2(
        (window.event as MouseEvent).clientX / window.innerWidth * 2 - 1,
        -((window.event as MouseEvent).clientY / window.innerHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(mouse, this.camera);
      const intersectionPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);
      
      if (intersectionPoint) {
        this.dragOffset.copy(intersectionPoint).sub(this.vrmManager.currentVrm.scene.position);
      }

      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp, { once: true });

      this.context.actions.setPose("pose_grabbed.vrma");
      this.context.actions.showMessage("으악!");

      console.log('[GrabVrmPlugin] Started dragging character.');
      
      // Disable orbit controls
      const controls = (this.camera.parent?.children.find((c: any) => c.constructor.name === 'OrbitControls') as any);
      if(controls) controls.enabled = false;
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.vrmManager.currentVrm) return;

    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersectionPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);

    if (intersectionPoint) {
      this.vrmManager.currentVrm.scene.position.copy(intersectionPoint.sub(this.dragOffset));
    }
  }

  private handleMouseUp(): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;

    this.context.actions.setPose("pose_stand_001.vrma");

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);

    console.log('[GrabVrmPlugin] Stopped dragging character.');

    // Re-enable orbit controls
    const controls = (this.camera.parent?.children.find((c: any) => c.constructor.name === 'OrbitControls') as any);
    if(controls) controls.enabled = true;
  }

  update(deltaTime: number, vrm: VRM): void {
    // All logic is event-driven
  }
}
