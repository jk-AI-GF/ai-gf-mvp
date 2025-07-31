/**
 * This file centralizes the definitions of all known events used in the EventBus.
 * By managing the list here, we can ensure consistency and provide a single
 * source of truth for features like the CustomTriggerPanel.
 */

export interface KnownEvent {
  name: string;
  description: string;
  // Optional: Define the shape of the data payload for this event
  // for better type-checking and documentation in the future.
  // payload?: Record<string, any>; 
}

export const KNOWN_EVENTS: KnownEvent[] = [
  {
    name: 'chat:newMessage',
    description: '사용자 또는 AI의 새 채팅 메시지가 생성되었을 때',
  },
  {
    name: 'vrm:loaded',
    description: '새 VRM 모델 로딩이 완료되었을 때',
  },
  {
    name: 'vrm:unloaded',
    description: '현재 VRM 모델이 언로드되었을 때',
  },
  {
    name: 'vrm:poseApplied',
    description: '캐릭터의 포즈가 변경되었을 때',
  },
  {
    name: 'ui:editModeToggled',
    description: 'UI 편집 모드가 켜지거나 꺼졌을 때',
  },
  {
    name: 'character_part_clicked',
    description: '캐릭터의 신체 부위(머리, 몸 등)를 클릭했을 때',
  },
  {
    name: 'character_part_right_clicked',
    description: '캐릭터의 신체 부위를 우클릭했을 때',
  },
  {
    name: 'system:mouse-ignore-toggle',
    description: '마우스 클릭 통과 모드가 변경되었을 때',
  },
  {
    name: 'camera:modeChanged',
    description: '카메라 모드(고정/자유)가 변경되었을 때',
  },
  // The following are high-frequency events and might not be suitable for most triggers,
  // but are included for completeness.
  {
    name: 'ui:updateFloatingMessagePosition',
    description: '캐릭터 머리 위 메시지 위치가 업데이트될 때 (매 프레임)',
  },
];
