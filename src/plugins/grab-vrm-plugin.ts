import * as THREE from 'three';
import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';
import { VRM } from '@pixiv/three-vrm';
import { VRMManager } from '../renderer/vrm-manager';

export class GrabVrmPlugin implements IPlugin {
  public readonly name = 'GrabVrm';
  public enabled = true;

  private context!: PluginContext;
  private vrmManager!: VRMManager;
  private camera!: THREE.Camera; // 타입을 일반 Camera로 변경

  private isDragging = false;
  private raycaster = new THREE.Raycaster();
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();
  private intersection = new THREE.Vector3();

  constructor() {
    this.handleMouseDownOnPart = this.handleMouseDownOnPart.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  setup(context: PluginContext): void {
    this.context = context;
    if (!context.vrmManager) return;

    this.vrmManager = context.vrmManager;
    // VRMManager에서 현재 활성 카메라를 가져옴
    this.camera = this.vrmManager.activeCamera; 

    this.context.eventBus.on('character_part_clicked', this.handleMouseDownOnPart);
    
    // 카메라 모드가 변경될 때마다 this.camera를 업데이트
    this.context.eventBus.on('camera:modeChanged', () => {
        this.camera = this.vrmManager.activeCamera;
    });

    console.log('[GrabVrmPlugin] Initialized.');
  }

  private handleMouseDownOnPart({ partName }: { partName: string }): void {
    if (!this.enabled || this.isDragging || !this.vrmManager.currentVrm) return;

    if (partName === 'hips') {
      this.isDragging = true;
      
      const mouse = new THREE.Vector2(
        ((window.event as MouseEvent).clientX / window.innerWidth) * 2 - 1,
        -((window.event as MouseEvent).clientY / window.innerHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(mouse, this.camera);

      // 드래그 평면을 캐릭터의 현재 위치를 기준으로 설정
      this.dragPlane.setFromNormalAndCoplanarPoint(
        this.camera.getWorldDirection(this.dragPlane.normal),
        this.vrmManager.currentVrm.scene.position
      );

      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
        this.dragOffset.copy(this.intersection).sub(this.vrmManager.currentVrm.scene.position);
      }

      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp, { once: true });

      this.context.actions.setPose("pose_grabbed.vrma");
      this.context.actions.showMessage("으악!");

      console.log('[GrabVrmPlugin] Started dragging character.');
      
      // Disable orbit controls only if they exist and are enabled
      if (this.camera instanceof THREE.PerspectiveCamera) {
        const controls = (this.vrmManager.activeCamera.parent?.children.find((c: any) => c.constructor.name === 'OrbitControls') as any);
        if (controls) controls.enabled = false;
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.vrmManager.currentVrm) return;

    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    if (this.camera instanceof THREE.PerspectiveCamera) {
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
            this.vrmManager.currentVrm.scene.position.copy(this.intersection.sub(this.dragOffset));
        }
    } else if (this.camera instanceof THREE.OrthographicCamera) {
        // 직교 카메라의 경우, 화면 좌표를 월드 좌표로 변환
        this.intersection.set(mouse.x, mouse.y, 0.5); // z는 -1에서 1 사이의 값
        this.intersection.unproject(this.camera);
        
        // 캐릭터의 원래 z 깊이를 유지하면서 x, y만 변경
        const currentPos = this.vrmManager.currentVrm.scene.position;
        const newPos = new THREE.Vector3(this.intersection.x, this.intersection.y, currentPos.z);
        
        currentPos.x = newPos.x;
        currentPos.y = newPos.y;
    }
  }

  private handleMouseUp(): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;

    this.context.actions.setPose("pose_stand_001.vrma");

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);

    console.log('[GrabVrmPlugin] Stopped dragging character.');

    // Re-enable orbit controls if they exist
    if (this.camera instanceof THREE.PerspectiveCamera) {
        const controls = (this.vrmManager.activeCamera.parent?.children.find((c: any) => c.constructor.name === 'OrbitControls') as any);
        if (controls) controls.enabled = true;
    }
  }

  update(deltaTime: number, vrm: VRM): void {
    // All logic is event-driven
  }
}
