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
  {
    name: 'chat:newMessage',
    description: '새 채팅 메시지 수신',
    payloadSchema: [
        { key: 'role', type: 'string', description: '메시지 발신자' },
        { key: 'text', type: 'string', description: '메시지 내용' }
    ],
  },
  {
    name: 'vrm:loaded',
    description: 'VRM 모델 로드 완료',
    payloadSchema: [
        // 현재 복잡한 객체는 지원하지 않으므로, 필요한 단순 데이터만 정의합니다.
    ],
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
  {
    name: 'character_part_clicked',
    description: '캐릭터 신체 부위 클릭',
    payloadSchema: [
        { key: 'partName', type: 'string', description: '클릭된 부위 이름' }
    ],
  },
];