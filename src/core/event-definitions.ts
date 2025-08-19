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
    description: 'events.chat:newMessage.description',
    payloadSchema: [
        { key: 'role', type: 'string', description: '메시지 발신자 (user, assistant)' },
        { key: 'text', type: 'string', description: '메시지 내용' }
    ],
  },
  {
    name: 'llm:responseReceived',
    description: 'events.llm:responseReceived.description',
    payloadSchema: [
        { key: 'text', type: 'string', description: '응답 텍스트' },
        { key: 'expression', type: 'string', description: '추천 표정' }
    ],
  },
  // VRM / Character
  {
    name: 'vrm:loaded',
    description: 'events.vrm:loaded.description',
    payloadSchema: [
        // { key: 'vrm', type: 'any', description: '로드된 VRM 객체' }, // 복잡한 객체는 일단 제외
        { key: 'expressionNames', type: 'any', description: '표정 이름 목록 (string[])' },
    ],
  },
  {
    name: 'vrm:unloaded',
    description: 'events.vrm:unloaded.description',
    payloadSchema: [],
  },
  {
    name: 'character:animationFinished',
    description: 'events.character:animationFinished.description',
    payloadSchema: [
        { key: 'clipName', type: 'string', description: '완료된 애니메이션 이름' }
    ],
  },
  {
    name: 'character:poseApplied',
    description: 'events.character:poseApplied.description',
    payloadSchema: [
        { key: 'poseName', type: 'string', description: '적용된 포즈 이름' }
    ],
  },
  {
    name: 'character:scaled',
    description: 'events.character:scaled.description',
    payloadSchema: [
        { key: 'scale', type: 'number', description: '적용된 크기 값' }
    ],
  },
  // Interaction
  {
    name: 'character:partClicked',
    description: 'events.character:partClicked.description',
    payloadSchema: [
        { key: 'partName', type: 'string', description: '클릭된 부위 이름' }
    ],
  },
  {
    name: 'character:partRightClicked',
    description: 'events.character:partRightClicked.description',
    payloadSchema: [
        { key: 'partName', type: 'string', description: '우클릭된 부위 이름' }
    ],
  },
  {
    name: 'character:grabStart',
    description: 'events.character:grabStart.description',
    payloadSchema: [],
  },
  {
    name: 'character:grabEnd',
    description: 'events.character:grabEnd.description',
    payloadSchema: [],
  },
  {
    name: 'character:dragStart',
    description: 'events.character:dragStart.description',
    payloadSchema: [],
  },
  {
    name: 'character:dragEnd',
    description: 'events.character:dragEnd.description',
    payloadSchema: [],
  },
  // UI
  {
    name: 'ui:showFloatingMessage',
    description: 'events.ui:showFloatingMessage.description',
    payloadSchema: [
        { key: 'text', type: 'string', description: '표시할 메시지' },
        { key: 'duration', type: 'number', description: '표시 시간(초)' }
    ],
  },
  {
    name: 'ui:updateFloatingMessagePosition',
    description: 'events.ui:updateFloatingMessagePosition.description',
    payloadSchema: [
        { key: 'left', type: 'number', description: 'x 좌표' },
        { key: 'top', type: 'number', description: 'y 좌표' },
        { key: 'visible', type: 'boolean', description: '표시 여부' }
    ],
  },
  {
    name: 'ui:vrmManagerToggled',
    description: 'events.ui:vrmManagerToggled.description',
    payloadSchema: [
        { key: 'isOpen', type: 'boolean', description: 'VRM 관리 모드 여부' }
    ]
  },
  // Camera
  {
    name: 'camera:setMode',
    description: 'events.camera:setMode.description',
    payloadSchema: [
        { key: 'mode', type: 'string', description: '카메라 모드 (orbit, fixed)' }
    ],
  },
  {
    name: 'camera:modeChanged',
    description: 'events.camera:modeChanged.description',
    payloadSchema: [
        { key: 'mode', type: 'string', description: '변경된 카메라 모드 (follow, free)' }
    ],
  },
  // System
  {
    name: 'system:mouseIgnoreToggled',
    description: 'events.system:mouseIgnoreToggled.description',
    payloadSchema: [
        { key: 'isIgnoring', type: 'boolean', description: '무시 여부' }
    ],
  },
  {
    name: 'plugin:enabled',
    description: 'events.plugin:enabled.description',
    payloadSchema: [
        { key: 'pluginName', type: 'string', description: '플러그인 이름' }
    ],
  },
  {
    name: 'plugin:disabled',
    description: 'events.plugin:disabled.description',
    payloadSchema: [
        { key: 'pluginName', type: 'string', description: '플러그인 이름' }
    ],
  },
  {
    name: 'sequence:updated',
    description: 'events.sequence:updated.description',
    payloadSchema: [],
  },
  {
    name: 'characterState:changed',
    description: 'events.characterState:changed.description',
    payloadSchema: [
        { key: 'characterName', type: 'string', description: '캐릭터의 현재 이름' },
        { key: 'userName', type: 'string', description: '캐릭터가 유저를 부르는 이름' },
        { key: 'curiosity', type: 'number', description: '현재 호기심 수치 (0-1)' },
        { key: 'happiness', type: 'number', description: '현재 행복 수치 (0-1)' },
        { key: 'energy', type: 'number', description: '현재 활력 수치 (0-1)' },
        { key: 'lastInteractionTimestamp', type: 'number', description: '마지막 상호작용 Unix 타임스탬프' }
    ],
  },
  {
    name: 'characterState:propertyChanged',
    description: 'events.characterState:propertyChanged.description',
    payloadSchema: [
        { key: 'property', type: 'string', description: '변경된 속성 이름 (curiosity, happiness, energy 등)' },
        { key: 'newValue', type: 'any', description: '변경된 새 값' },
        { key: 'oldValue', type: 'any', description: '변경 전의 이전 값' }
    ],
  },
  // 2D Assets
  {
    name: 'asset:updated',
    description: 'events.asset:updated.description',
    payloadSchema: [
        { key: 'assets', type: 'any', description: '현재 화면에 표시된 모든 에셋의 상태 배열' }
    ],
  },
];
