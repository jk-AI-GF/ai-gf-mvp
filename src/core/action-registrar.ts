
import * as THREE from 'three';
import { ActionRegistry } from './action-registry';
import { VRMManager } from '../renderer/vrm-manager';
import eventBus from './event-bus';
import { playTTS } from '../renderer/audio-service';
import { ActionDefinition } from '../plugin-api/actions';
import { WebGLRenderer } from 'three';

import { ICharacterState, PluginContext } from '../plugin-api/plugin-context';
import { characterState } from './character-state';

// action-registrar.ts
// 이 파일은 모든 시스템 액션을 ActionRegistry에 등록하는 역할을 합니다.
// 렌더러 프로세스에서만 사용됩니다.

import { ChatService } from '../renderer/chat-service';

export function registerCoreActions(
  registry: ActionRegistry,
  context: PluginContext,
  renderer: WebGLRenderer,
  chatService: ChatService,
) {
  const { vrmManager, sequenceManager, imageAssetManager } = context;
  if (!vrmManager || !renderer || !sequenceManager || !imageAssetManager || !chatService) {
    console.error("Cannot register core actions: A required manager is missing from the context.");
    return;
  }
  
  // getAvailableActions는 특별한 케이스로, 레지스트리 자체에서 정보를 가져옵니다.
  // 별도로 등록하지 않고 context-factory에서 직접 처리합니다.

  // --- LLM Actions ---
  registry.register(
    {
    name: 'llm.invoke',
      description: 'LLM에 동적 프롬프트를 보내고 캐릭터의 반응을 유도합니다.',
      params: [
        { name: 'userRequest', type: 'string', description: 'LLM에게 전달할 핵심 요청' },
        { name: 'includeBasePrompt', type: 'boolean', defaultValue: true, description: '기본 시스템 프롬프트를 포함할지 여부' },
        { name: 'includePersona', type: 'boolean', defaultValue: true, description: '현재 페르소나 정보를 포함할지 여부' },
        { name: 'includeCharacterState', type: 'boolean', defaultValue: true, description: '캐릭터의 현재 상태를 포함할지 여부' },
        { name: 'includeSubroutines', type: 'boolean', defaultValue: true, description: '사용 가능한 서브루틴 목록과 JSON 출력 형식을 포함할지 여부' },
        { name: 'includeChatHistory', type: 'boolean', defaultValue: false, description: '현재 대화 기록을 포함할지 여부' },
      ],
      returns: { type: 'string', description: 'LLM의 텍스트 응답' },
    },
    async (
      userRequest: string,
      includeBasePrompt?: boolean,
      includePersona?: boolean,
      includeCharacterState?: boolean,
      includeSubroutines?: boolean,
      includeChatHistory?: boolean
    ) => {
      const llmSettings = await window.electronAPI.getLlmSettings();
      const persona = await window.electronAPI.getPersona();

      return chatService.invokeLlmAsAction(persona, llmSettings, {
        userRequest,
        includeBasePrompt,
        includePersona,
        includeCharacterState,
        includeSubroutines,
        includeChatHistory,
      });
    }
  );
  
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
        { name: 'waitUntilFinished', type: 'boolean', defaultValue: false, description: '종료까지 실행 대기' },
      ],
    },
    async (animationName: string, loop?: boolean, crossFadeDuration?: number, waitUntilFinished?: boolean) => {
      return vrmManager.loadAndPlayAnimation(animationName, loop, crossFadeDuration, waitUntilFinished);
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
    (message: string, duration?: number) => {
      eventBus.emit('ui:showFloatingMessage', { text: message, duration });
    }
  );

  registry.register(
    {
      name: 'moveCharacterToScreenPosition',
      description: '화면 비율 좌표로 캐릭터를 이동시킵니다.',
      params: [
        { name: 'x', type: 'number', description: '화면 X 좌표 (0.0-1.0은 화면 내)', defaultValue: 0.5 },
        { name: 'y', type: 'number', description: '화면 Y 좌표 (0.0-1.0은 화면 내)', defaultValue: 0.5 },
        { name: 'duration', type: 'number', description: '이동 시간(초)', defaultValue: 1.0 },
      ],
    },
    async (x: number, y: number, duration: number) => {
      if (!vrmManager.currentVrm) {
        console.warn("moveCharacterToScreenPosition: VRM not loaded.");
        return;
      }
      // A more robust check for a valid camera object.
      if (!vrmManager.activeCamera || !vrmManager.activeCamera.isCamera) {
        console.error("moveCharacterToScreenPosition: Active camera is not a valid THREE.Camera. Aborting.", vrmManager.activeCamera);
        return;
      }

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
        eventBus.emit('character:dragStart'); // 중력 비활성화
        await vrmManager.animateCharacterMove(targetPosition, duration);
        eventBus.emit('character:dragEnd'); // 이동 완료 후 중력 재활성화
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
      params: [
        { name: 'poseName', type: 'string', description: '포즈 파일 이름', dynamicOptions: 'poses' },
        { name: 'blendTime', type: 'number', defaultValue: 0.0, description: '블렌딩 시간(초)' }
      ],
    },
    async (poseName: string, blendTime?: number) => {
      // Ensure the promise from loadAndApplyPose is awaited and returned
      return await vrmManager.loadAndApplyPose(poseName, blendTime);
    }
  );

  registry.register(
    {
      name: 'lookAt',
      description: '캐릭터의 시선을 고정합니다.',
      params: [
        {
          name: 'target',
          type: 'string',
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
      name: 'log',
      description: '콘솔에 디버그 메시지를 출력합니다.',
      params: [{ name: 'message', type: 'any', description: '출력할 메시지' }],
    },
    (message: any) => {
      console.log('[SEQUENCE DEBUG]', message);
    }
  );

  registry.register(
    {
      name: 'setCharacterState',
      description: '캐릭터의 내부 상태 값을 변경합니다.',
      params: [
        { name: 'key', type: 'enum', options: ['characterName', 'userName', 'curiosity', 'happiness', 'energy'], description: '변경할 상태' },
        { name: 'mode', type: 'enum', options: ['set', 'add', 'subtract'], defaultValue: 'set', description: '변경 방식' },
        { name: 'value', type: 'any', description: '변경할 값' },
      ],
    },
    (key: 'characterName' | 'userName' | 'curiosity' | 'happiness' | 'energy', mode: 'set' | 'add' | 'subtract', value: any) => {
      // 1. Key 유효성 검사
      if (!key) {
        console.error(`[Action] setCharacterState: 'key' is required but was not provided.`);
        return;
      }

      // 2. 모드에 따른 로직 분기
      if (mode === 'set') {
        // 'set' 모드: 타입에 맞게 값을 직접 설정
        if (key === 'characterName' || key === 'userName') {
          if (typeof value === 'string') {
            characterState[key] = value;
          } else {
            console.warn(`[Action] setCharacterState: '${key}' requires a string value for 'set' mode.`);
          }
        } else { // 'curiosity', 'happiness', 'energy'
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            characterState[key] = numValue; // Setter에서 0-1 클램핑 처리
          } else {
            console.warn(`[Action] setCharacterState: '${key}' requires a numeric value for 'set' mode.`);
          }
        }
      } else {
        // 'add' / 'subtract' 모드: 숫자 연산만 허용
        // 이 블록에서는 key가 숫자형 상태임을 타입스크립트에게 명확히 알려줍니다.
        const numericKey = key as 'curiosity' | 'happiness' | 'energy';
        const currentValue = characterState[numericKey];

        if (typeof currentValue !== 'number' || typeof value !== 'number') {
          console.warn(`[Action] setCharacterState: '${key}' requires numeric values for '${mode}' mode.`);
          return;
        }

        let newValue = currentValue;
        if (mode === 'add') {
          newValue = currentValue + value;
        } else { // 'subtract'
          newValue = currentValue - value;
        }
        characterState[numericKey] = newValue; // Setter에서 0-1 클램핑 처리
      }
    }
  );

  registry.register(
    {
      name: 'toggleSequence',
      description: '지정된 시퀀스를 활성화하거나 비활성화합니다.',
      params: [
        { name: 'sequenceName', type: 'string', description: '토글할 시퀀스의 파일 이름', dynamicOptions: 'sequences' },
        { name: 'shouldActivate', type: 'boolean', description: '활성화 여부' },
      ],
    },
    (sequenceName: string, shouldActivate: boolean) => {
      sequenceManager.toggleSequence(sequenceName, shouldActivate);
    }
  );

  registry.register(
    {
      name: 'togglePlugin',
      description: '지정된 플러그인을 활성화하거나 비활성화합니다.',
      params: [
        { name: 'pluginName', type: 'string', description: '토글할 플러그인의 이름', dynamicOptions: 'plugins' },
        { name: 'enabled', type: 'boolean', description: '활성화 여부' },
      ],
    },
    (pluginName: string, enabled: boolean) => {
      if (enabled) {
        context.pluginManager?.enable(pluginName);
      } else {
        context.pluginManager?.disable(pluginName);
      }
    }
  );

  registry.register(
    {
      name: 'disableAllPlugins',
      description: '모든 활성 플러그인을 비활성화하고 현재 상태를 기억합니다.',
      params: [],
    },
    () => {
      context.pluginManager?.disableAllAndRemember();
    }
  );

  registry.register(
    {
      name: 'restorePlugins',
      description: '이전에 disableAllPlugins으로 비활성화된 플러그인들을 다시 활성화합니다.',
      params: [],
    },
    () => {
      context.pluginManager?.restorePlugins();
    }
  );

  registry.register(
    {
      name: 'setCharacterScale',
      description: '캐릭터의 전체 크기를 조절합니다.',
      params: [
        { name: 'scale', type: 'number', defaultValue: 1.0, description: '크기 값 (1.0이 기본)' },
      ],
    },
    (scale: number) => {
      vrmManager.setScale(scale);
    }
  );

  registry.register(
    {
      name: 'setRotation',
      description: '캐릭터를 Y축 기준으로 회전시킵니다.',
      params: [
        { name: 'y', type: 'number', description: 'Y축 회전값 (degrees)', defaultValue: 0 },
        { name: 'blendTime', type: 'number', defaultValue: 0.5, description: '블렌딩 시간(초)' },
      ],
    },
    (y: number, blendTime: number) => {
      const yRad = THREE.MathUtils.degToRad(y);
      return vrmManager.animateCharacterRotation(yRad, blendTime);
    }
  );

  // --- 2D Asset Actions ---
  registry.register(
    {
      name: 'showImageAsset',
      description: '화면에 2D 이미지 에셋을 표시하고 ID를 반환합니다.',
      params: [
        { name: 'fileName', type: 'string', description: '표시할 이미지 파일 이름', dynamicOptions: 'assets' },
        { name: 'x', type: 'number', defaultValue: 0.5, description: '초기 X 위치 (0-1)' },
        { name: 'y', type: 'number', defaultValue: 0.5, description: '초기 Y 위치 (0-1)' },
        { name: 'scale', type: 'number', defaultValue: 1.0, description: '초기 크기' },
      ],
      returns: { type: 'string', description: '생성된 에셋의 고유 ID' },
    },
    async (fileName: string, x?: number, y?: number, scale?: number) => {
      return imageAssetManager.show(fileName, { x, y, scale });
    }
  );

  registry.register(
    {
      name: 'hideImageAsset',
      description: 'ID로 특정 2D 이미지 에셋을 숨깁니다.',
      params: [
        { name: 'assetId', type: 'string', description: '숨길 에셋의 ID' },
      ],
    },
    (assetId: string) => {
      imageAssetManager.hide(assetId);
    }
  );

  registry.register(
    {
      name: 'moveImageAsset',
      description: 'ID로 특정 2D 이미지 에셋을 이동시킵니다.',
      params: [
        { name: 'assetId', type: 'string', description: '이동할 에셋의 ID' },
        { name: 'x', type: 'number', description: '새로운 X 위치 (0-1)' },
        { name: 'y', type: 'number', description: '새로운 Y 위치 (0-1)' },
        // { name: 'duration', type: 'number', defaultValue: 0.5, description: '이동 시간(초)' }, // TODO: Add animation support
      ],
    },
    (assetId: string, x: number, y: number) => {
      imageAssetManager.update(assetId, { x, y });
    }
  );

  registry.register(
    {
      name: 'updateImageAsset',
      description: 'ID로 특정 2D 이미지 에셋의 속성을 변경합니다.',
      params: [
        { name: 'assetId', type: 'string', description: '수정할 에셋의 ID' },
        { name: 'scale', type: 'number', description: '새로운 크기' },
        { name: 'opacity', type: 'number', description: '새로운 투명도 (0-1)' },
      ],
    },
    (assetId: string, scale?: number, opacity?: number) => {
      imageAssetManager.update(assetId, { scale, opacity });
    }
  );
}

