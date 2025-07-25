
/**
 * 모드가 게임에 영향을 줄 수 있는 함수 호출을 정의하는 인터페이스입니다.
 * 이 인터페이스의 구현체는 ModuleContext를 통해 모드에 노출됩니다.
 */
export interface Actions {
  /**
   * VRM 모델의 특정 애니메이션을 재생합니다.
   * @param animationName 재생할 애니메이션의 이름 (예: 'idle', 'wave')
   * @param loop 애니메이션 반복 여부
   * @param crossFadeDuration 애니메이션 전환 시간 (초)
   */
  playAnimation(animationName: string, loop?: boolean, crossFadeDuration?: number): void;

  /**
   * 화면에 메시지를 표시합니다.
   * @param message 표시할 텍스트 메시지
   * @param duration 메시지가 표시될 시간 (밀리초)
   */
  showMessage(message: string, duration?: number): void;

  /**
   * VRM 모델의 표정을 변경합니다.
   * @param expressionName 변경할 표정의 이름 (예: 'happy', 'sad')
   * @param weight 표정의 강도 (0.0 ~ 1.0)
   * @param duration 표정 변경에 걸리는 시간 (초)
   */
  setExpression(expressionName: string, weight: number, duration?: number): void;

  /**
   * VRM 모델의 포즈를 설정합니다.
   * @param poseName 설정할 포즈의 이름 (보통 .vrma 파일 이름)
   */
  setPose(poseName: string): void;

  /**
   * VRM 모델이 특정 대상을 바라보도록 합니다.
   * @param target 바라볼 대상. 'camera', 'mouse' 문자열, [x, y, z] 형태의 좌표 배열이 될 수 있습니다. null을 전달하면 시선 처리를 중지합니다.
   */
  lookAt(target: 'camera' | 'mouse' | [number, number, number] | null): void;
}
