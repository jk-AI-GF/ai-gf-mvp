
import * as THREE from 'three';
import { ActionRegistry } from './action-registry';
import { VRMManager } from '../renderer/vrm-manager';
import eventBus from './event-bus';
import { playTTS } from '../renderer/audio-service';
import { ActionDefinition } from '../plugin-api/actions';
import { WebGLRenderer } from 'three';

// action-registrar.ts
// 이 파일은 모든 시스템 액션을 ActionRegistry에 등록하는 역할을 합니다.
// 렌더러 프로세스에서만 사용됩니다.

export function registerCoreActions(
  registry: ActionRegistry,
  vrmManager: VRMManager,
  renderer: WebGLRenderer,
) {
  // getAvailableActions는 특별한 케이스로, 레지스트리 자체에서 정보를 가져옵니다.
  // 별도로 등록하지 않고 context-factory에서 직접 처리합니다.

  registry.register(
    {
      name: 'playAnimation',
      description: '캐릭터 애니메이션을 재생합니다.',
      params: [
        { 
          name: 'animationName', 
          type: 'string', 
          description: '애니메이션 파일 이름',
          dynamicOptions: 'animations', // UI 힌트 추가
          validation: (value: any) => (typeof value === 'string' && value.trim() !== '') || '애니메이션 이름은 필수입니다.'
        },
        { name: 'loop', type: 'boolean', defaultValue: false, description: '반복 여부' },
        { name: 'crossFadeDuration', type: 'number', defaultValue: 0.5, description: '페이드 시간(초)' },
      ],
    },
    (animationName: string, loop?: boolean, crossFadeDuration?: number) => {
      return vrmManager.loadAndPlayAnimation(animationName, loop, crossFadeDuration);
    }
  );

  registry.register(
    {
      name: 'playTTS',
      description: 'TTS 음성을 재생합니다.',
      params: [{ 
        name: 'text', 
        type: 'string', 
        description: '재생할 내용',
        validation: (value: any) => (typeof value === 'string' && value.trim() !== '') || '재생할 내용은 필수입니다.'
      }],
    },
    (text: string) => {
      playTTS(text);
    }
  );

  registry.register(
    {
      name: 'showMessage',
      description: '화면에 말풍선 메시지를 표시합니다.',
      params: [
        { name: 'message', type: 'string', description: '표시할 메시지' },
        { name: 'duration', type: 'number', defaultValue: 5, description: '표시 시간(초)' },
      ],
    },
    ({ message, duration }: { message: string; duration?: number }) => {
      eventBus.emit('ui:showFloatingMessage', { text: message, duration });
    }
  );

  (text: string) => {
      playTTS(text);
    }
  ;

  registry.register(
    {
      name: 'moveCharacterToScreenPosition',
      description: '화면 비율 좌표로 캐릭터를 이동시킵니다.',
      params: [
        { name: 'x', type: 'number', description: '화면 X 좌표 (0.0 ~ 1.0)', defaultValue: 0.5 },
        { name: 'y', type: 'number', description: '화면 Y 좌표 (0.0 ~ 1.0)', defaultValue: 0.5 },
        { name: 'duration', type: 'number', description: '이동 시간(초)', defaultValue: 1.0 },
      ],
    },
    (x: number, y: number, duration: number) => {
      if (!vrmManager.currentVrm) return;

      // 1. 화면 비율 좌표를 NDC(-1 to 1)로 변환
      const ndc = new THREE.Vector2(
        x * 2 - 1,
        -(y * 2 - 1) // Y축은 반전
      );

      // 2. Raycaster 설정
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, vrmManager.activeCamera);

      // 3. grab-vrm-plugin과 동일한 방식으로 평면 생성
      // 카메라를 향하고, 현재 캐릭터의 위치를 통과하는 평면을 만듭니다.
      const plane = new THREE.Plane();
      plane.setFromNormalAndCoplanarPoint(
        vrmManager.activeCamera.getWorldDirection(plane.normal),
        vrmManager.currentVrm.scene.position
      );
      
      // 4. 평면과의 교차점 계산
      const targetPosition = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, targetPosition)) {
        // 교차점이 성공적으로 계산된 경우에만 이동을 실행합니다.
        vrmManager.animateCharacterMove(targetPosition, duration);
      } else {
        console.warn("moveCharacterToScreenPosition: Could not find an intersection point on the dynamic plane.");
      }
    }
  );

  registry.register(
    {
      name: 'setExpression',
      description: '캐릭터의 표정을 부드럽게 변경합니다.',
      params: [
        { name: 'expressionName', type: 'string', description: '표정 이름' },
        { name: 'weight', type: 'number', defaultValue: 1.0, description: '강도 (0-1)' },
        { name: 'duration', type: 'number', defaultValue: 0.1, description: '변경 시간(초)' },
      ],
    },
    (expressionName: string, weight: number, duration?: number) => {
      vrmManager.animateExpression(expressionName, weight, duration);
    }
  );

  registry.register(
    {
      name: 'setExpressionWeight',
      description: '캐릭터 표정 가중치를 즉시 설정합니다.',
      params: [
        { name: 'expressionName', type: 'string', description: '표정 이름' },
        { name: 'weight', type: 'number', defaultValue: 1.0, description: '강도 (0-1)' },
      ],
    },
    (expressionName: string, weight: number) => {
      if (vrmManager.currentVrm?.expressionManager) {
        vrmManager.currentVrm.expressionManager.setValue(expressionName, weight);
      }
    }
  );

  registry.register(
    {
      name: 'setPose',
      description: '캐릭터의 포즈를 설정합니다.',
      params: [{ name: 'poseName', type: 'string', description: '포즈 파일 이름', dynamicOptions: 'poses' }],
    },
    (poseName: string) => {
      vrmManager.loadAndApplyPose(poseName);
    }
  );

  registry.register(
    {
      name: 'lookAt',
      description: '캐릭터의 시선을 고정합니다.',
      params: [
        {
          name: 'target',
          type: 'enum',
          options: ['camera', 'mouse', 'null'],
          description: '바라볼 대상',
        },
      ],
    },
    (target: 'camera' | 'mouse' | [number, number, number] | null) => {
      if (target === 'camera' || target === 'mouse') {
        vrmManager.lookAt(target);
      } else if (Array.isArray(target)) {
        vrmManager.lookAt(new THREE.Vector3(target[0], target[1], target[2]));
      } else {
        vrmManager.lookAt(null);
      }
    }
  );

  registry.register(
    {
      name: 'changeBackground',
      description: '배경 이미지를 변경합니다.',
      params: [{ name: 'imagePath', type: 'string', description: '이미지 파일 경로' }],
    },
    (imagePath: string) => {
      document.body.style.backgroundImage = `url('${imagePath}')`;
      document.body.style.backgroundColor = 'transparent';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      renderer.setClearAlpha(0);
    }
  );

  registry.register(
    {
      name: 'setHitboxesVisible',
      description: '히트박스 가시성을 설정합니다.',
      params: [{ name: 'visible', type: 'boolean', description: '표시 여부' }],
    },
    (visible: boolean) => {
      vrmManager.setHitboxesVisible(visible);
    }
  );

  registry.register(
    {
      name: 'resetPose',
      description: '캐릭터를 기본 T-Pose로 되돌립니다.',
      params: [],
    },
    () => {
      vrmManager.resetToTPose();
    }
  );

  registry.register(
    {
      name: 'saveCurrentPose',
      description: '현재 포즈를 파일로 저장합니다.',
      params: [],
    },
    () => {
      vrmManager.saveCurrentPose();
    }
  );

  registry.register(
    {
      name: 'loadCharacter',
      description: '다른 VRM 모델을 불러옵니다.',
      params: [{ name: 'fileName', type: 'string', description: 'VRM 파일 이름' }],
    },
    (fileName: string) => {
      return vrmManager.loadVRM(fileName);
    }
  );

  registry.register(
    {
      name: 'setCameraMode',
      description: '카메라 모드를 변경합니다.',
      params: [
        {
          name: 'mode',
          type: 'enum',
          options: ['orbit', 'fixed'],
          description: '카메라 모드',
        },
      ],
    },
    (mode: 'orbit' | 'fixed') => {
      eventBus.emit('camera:setMode', { mode });
    }
  );

  registry.register(
    {
      name: 'setContext',
      description: '전역 컨텍스트에 값을 저장합니다.',
      params: [
        { name: 'key', type: 'string', description: '저장할 키' },
        { name: 'value', type: 'string', description: '저장할 값 (문자열, 숫자, boolean만 가능)' },
      ],
    },
    (key: string, value: any) => {
      window.electronAPI.send('context:set', key, value);
    }
  );

  registry.register(
    {
        name: 'getContext',
        description: '전역 컨텍스트에서 값을 가져옵니다.',
        params: [{ name: 'key', type: 'string', description: '가져올 키' }],
        returnType: 'any',
    },
    (key: string) => {
        return window.electronAPI.invoke('context:get', key);
    }
  );

  registry.register(
    {
      name: 'log',
      description: '콘솔에 디버그 메시지를 출력합니다.',
      params: [{ name: 'message', type: 'any', description: '출력할 메시지' }],
    },
    (message: any) => {
      console.log('[SEQUENCE DEBUG]', message);
    }
  );
}