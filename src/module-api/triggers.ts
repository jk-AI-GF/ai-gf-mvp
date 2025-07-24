
// 모든 트리거의 조건과 액션에 전달될 중앙 데이터 객체입니다.
// 지금은 비어있지만, 앞으로 앱의 상태를 나타내는 속성들이 추가될 것입니다.
export interface Context {
  // 예시: 현재 활성화된 앱 이름
  activeAppName?: string;
  // 예시: 마지막 사용자 입력 이후 시간 (초)
  secondsSinceLastInput?: number;
}

// 조건 함수 타입 정의
// Context를 기반으로 참/거짓을 반환하여 액션 실행 여부를 결정합니다.
export type Condition = (ctx: Context) => boolean;

// 액션 함수 타입 정의
// 조건이 충족되었을 때 실행될 동작입니다.
export type Action = (ctx: Context) => void;

// 트리거 객체 인터페이스
// 하나의 트리거는 이름, 조건, 액션으로 구성됩니다.
export interface Trigger {
  name: string;
  condition: Condition;
  action: Action;
}
