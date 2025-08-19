import * as THREE from 'three';
import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

export class GravityPlugin implements IPlugin {
  public readonly name = 'Gravity';
  public enabled = true;
  public runInVrmMode = false; // 중력은 VRM 관리 모드에서 비활성화

  private context!: PluginContext;
  private vrmManager!: PluginContext['vrmManager'];
  
  private gravityForce = 5.0 * 0.0005; // 초당 프레임에 맞게 조정된 중력 값
  private velocityY = 0;
  private groundY = -0.1; // 지면의 높이
  private isGravityActive = true; // 드래그 중 비활성화를 위한 플래그

  private dragStartUnsubscribe: (() => void) | null = null;
  private dragEndUnsubscribe: (() => void) | null = null;
  private grabStartUnsubscribe: (() => void) | null = null;
  private grabEndUnsubscribe: (() => void) | null = null;

  setup(context: PluginContext): void {
    this.context = context;
    this.vrmManager = context.vrmManager;
    console.log('[GravityPlugin] Setup complete.');
  }

  onEnable(): void {
    console.log('[GravityPlugin] Enabled.');
    // 드래그 시작/종료 이벤트 구독
    this.dragStartUnsubscribe = this.context.eventBus.on('character:dragStart', () => {
      this.isGravityActive = false;
      this.velocityY = 0; // 드래그 시작 시 속도 초기화
      console.log('[GravityPlugin] Gravity deactivated due to drag start.');
    });
    this.dragEndUnsubscribe = this.context.eventBus.on('character:dragEnd', () => {
      this.isGravityActive = true;
      console.log('[GravityPlugin] Gravity reactivated due to drag end.');
    });
    this.grabStartUnsubscribe = this.context.eventBus.on('character:grabStart', () => {
      this.isGravityActive = false;
      this.velocityY = 0; // 드래그 시작 시 속도 초기화
      console.log('[GravityPlugin] Gravity deactivated due to grab start.');
    });
    this.grabEndUnsubscribe = this.context.eventBus.on('character:grabEnd', () => {
      this.isGravityActive = true;
      console.log('[GravityPlugin] Gravity reactivated due to grab end.');
    });
  }

  onDisable(): void {
    console.log('[GravityPlugin] Disabled.');
    this.dragStartUnsubscribe?.();
    this.dragEndUnsubscribe?.();
    this.grabStartUnsubscribe?.();
    this.grabEndUnsubscribe?.();
  }

  update(deltaTime: number, vrm: VRM): void {
    if (!this.isGravityActive || !vrm.scene) return;

    const hips = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips);
    if (!hips) return;

    // 캐릭터의 현재 월드 위치를 가져옵니다.
    const characterPosition = vrm.scene.position;

    // 캐릭터가 공중에 떠 있는 경우
    if (characterPosition.y > this.groundY) {
      // 중력을 적용하여 y축 속도를 업데이트합니다.
      this.velocityY -= this.gravityForce * (deltaTime * 60); // deltaTime 보정
      // 속도를 위치에 적용합니다.
      characterPosition.y += this.velocityY;
    }

    // 캐릭터가 땅에 닿거나 땅 아래로 떨어진 경우
    if (characterPosition.y <= this.groundY) {
      characterPosition.y = this.groundY; // 위치를 지면으로 고정
      this.velocityY = 0; // 속도 초기화
    }
  }
}
