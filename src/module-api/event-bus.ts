
// EventBus 인터페이스 정의
// 모드와 앱의 다른 컴포넌트들이 이벤트를 주고받는 통로 역할을 합니다.
export interface EventBus {
  /**
   * 특정 이름의 이벤트를 발행합니다.
   * @param eventName 발행할 이벤트의 이름
   * @param payload 이벤트와 함께 전달할 데이터 (선택 사항)
   */
  emit<T = unknown>(eventName: string, payload?: T): void;

  /**
   * 특정 이름의 이벤트를 구독합니다.
   * @param eventName 구독할 이벤트의 이름
   * @param listener 이벤트가 발생했을 때 실행될 콜백 함수
   * @returns 구독을 해지할 수 있는 함수
   */
  on<T = unknown>(eventName: string, listener: (payload: T) => void): () => void;
}
