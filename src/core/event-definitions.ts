/**
 * 이 파일은 시스템에서 발생하는 각 이벤트와,
 * 해당 이벤트가 트리거 조건에서 사용할 수 있는 컨텍스트 키를 정의합니다.
 */

export interface EventDefinition {
  name: string;
  description: string;
  keys: string[];
}

export const EVENT_DEFINITIONS: EventDefinition[] = [
  {
    name: 'chat:newMessage',
    description: '사용자 또는 AI의 새 채팅 메시지',
    keys: ['event.role', 'event.text'],
  },
  {
    name: 'vrm:loaded',
    description: 'VRM 모델 로드 완료',
    keys: ['event.vrm.meta.modelName'],
  },
  {
    name: 'vrm:animationFinished',
    description: '애니메이션 재생 완료',
    keys: ['event.clipName'],
  },
  {
    name: 'vrm:poseApplied',
    description: '포즈 적용 완료',
    keys: ['event.poseName'],
  },
  {
    name: 'character_part_clicked',
    description: '캐릭터 신체 부위 클릭',
    keys: ['event.partName'],
  },
];
