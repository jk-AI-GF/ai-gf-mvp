/**
 * 이 파일은 시스템에서 발생하는 각 이벤트와,
 * 해당 이벤트가 전달하는 데이터(페이로드)의 상세 구조를 정의합니다.
 * 이 정보는 시퀀스 에디터의 이벤트 노드가 올바른 출력 포트를 생성하는 데 사용됩니다.
 */

import { IPort } from "./sequence/BaseNode";

// 사용 가능한 페이로드 키의 타입 정의
export type PayloadKeyType = IPort['type'];

export interface EventPayloadItem {
    key: string; // 페이로드에 포함된 데이터의 이름 (예: 'role', 'text')
    type: PayloadKeyType; // 데이터의 타입 (예: 'string', 'number')
    description: string; // 데이터에 대한 설명
}

export interface EventDefinition {
  name: string; // 이벤트 이름 (예: 'chat:newMessage')
  description: string;
  payloadSchema: EventPayloadItem[]; // 이벤트가 전달하는 데이터 구조
}

export const EVENT_DEFINITIONS: EventDefinition[] = [
  // Chat
  {
    name: 'chat:newMessage',
    description: '새 채팅 메시지 수신',
    payloadSchema: [
        { key: 'role', type: 'string', description: '메시지 발신자 (user, assistant)' },
        { key: 'text', type: 'string', description: '메시지 내용' }
    ],
  },
  {
    name: 'llm:responseReceived',
    description: 'LLM 응답 수신',
    payloadSchema: [
        { key: 'text', type: 'string', description: '응답 텍스트' },
        { key: 'expression', type: 'string', description: '추천 표정' }
    ],
  },
  // VRM
  {
    name: 'vrm:loaded',
    description: 'VRM 모델 로드 완료',
    payloadSchema: [
        // { key: 'vrm', type: 'any', description: '로드된 VRM 객체' }, // 복잡한 객체는 일단 제외
        { key: 'expressionNames', type: 'any', description: '표정 이름 목록 (string[])' },
    ],
  },
  {
    name: 'vrm:unloaded',
    description: 'VRM 모델 언로드',
    payloadSchema: [],
  },
  {
    name: 'vrm:animationFinished',
    description: '애니메이션 재생 완료',
    payloadSchema: [
        { key: 'clipName', type: 'string', description: '완료된 애니메이션 이름' }
    ],
  },
  {
    name: 'vrm:poseApplied',
    description: '포즈 적용 완료',
    payloadSchema: [
        { key: 'poseName', type: 'string', description: '적용된 포즈 이름' }
    ],
  },
  // Interaction
  {
    name: 'character_part_clicked',
    description: '캐릭터 신체 부위 클릭',
    payloadSchema: [
        { key: 'partName', type: 'string', description: '클릭된 부위 이름' }
    ],
  },
  {
    name: 'character_part_right_clicked',
    description: '캐릭터 신체 부위 우클릭',
    payloadSchema: [
        { key: 'partName', type: 'string', description: '우클릭된 부위 이름' }
    ],
  },
  // UI
  {
    name: 'ui:showFloatingMessage',
    description: '플로팅 메시지 표시',
    payloadSchema: [
        { key: 'text', type: 'string', description: '표시할 메시지' },
        { key: 'duration', type: 'number', description: '표시 시간(초)' }
    ],
  },
  {
    name: 'ui:updateFloatingMessagePosition',
    description: '플로팅 메시지 위치 업데이트',
    payloadSchema: [
        { key: 'left', type: 'number', description: 'x 좌표' },
        { key: 'top', type: 'number', description: 'y 좌표' },
        { key: 'visible', type: 'boolean', description: '표시 여부' }
    ],
  },
  {
    name: 'ui:editModeToggled',
    description: '편집 모드 활성/비활성',
    payloadSchema: [
        { key: 'isEditMode', type: 'boolean', description: '편집 모드 여부' }
    ],
  },
  // Camera
  {
    name: 'camera:setMode',
    description: '카메라 모드 설정',
    payloadSchema: [
        { key: 'mode', type: 'string', description: '카메라 모드 (orbit, fixed)' }
    ],
  },
  {
    name: 'camera:modeChanged',
    description: '카메라 모드 변경됨',
    payloadSchema: [
        { key: 'mode', type: 'string', description: '변경된 카메라 모드 (follow, free)' }
    ],
  },
  // System
  {
    name: 'system:mouse-ignore-toggle',
    description: '마우스 이벤트 무시 전환',
    payloadSchema: [
        { key: 'isIgnoring', type: 'boolean', description: '무시 여부' }
    ],
  },
  {
    name: 'plugin:enabled',
    description: '플러그인 활성화됨',
    payloadSchema: [
        { key: 'pluginName', type: 'string', description: '플러그인 이름' }
    ],
  },
  {
    name: 'plugin:disabled',
    description: '플러그인 비활성화됨',
    payloadSchema: [
        { key: 'pluginName', type: 'string', description: '플러그인 이름' }
    ],
  },
  {
    name: 'sequences-updated',
    description: '시퀀스 목록 업데이트됨',
    payloadSchema: [],
  },
  {
    name: 'character-state:changed',
    description: '캐릭터의 내부 상태(호기심, 행복 등)가 변경될 때 발생합니다. (전체 상태)',
    payloadSchema: [
        { key: 'curiosity', type: 'number', description: '현재 호기심 수치 (0-1)' },
        { key: 'happiness', type: 'number', description: '현재 행복 수치 (0-1)' },
        { key: 'energy', type: 'number', description: '현재 활력 수치 (0-1)' },
        { key: 'lastInteractionTimestamp', type: 'number', description: '마지막 상호작용 Unix 타임스탬프' }
    ],
  },
  {
    name: 'character-state:propertyChanged',
    description: '캐릭터의 특정 내부 상태 값이 변경될 때 발생합니다.',
    payloadSchema: [
        { key: 'property', type: 'string', description: '변경된 속성 이름 (curiosity, happiness, energy 등)' },
        { key: 'newValue', type: 'number', description: '변경된 새 값' },
        { key: 'oldValue', type: 'number', description: '변경 전의 이전 값' }
    ],
  },
];