/**
 * 모드가 시스템 수준의 기능을 제어할 수 있는 인터페이스입니다.
 */
export interface SystemControls {
  /**
   * TTS(Text-to-Speech) 기능을 켜거나 끕니다.
   * @param enable - 활성화 여부
   */
  toggleTts(enable: boolean): void;

  /**
   * 마우스 클릭 통과(ignore mouse events) 기능을 토글합니다.
   */
  toggleMouseIgnore(): void;

  /**
   * 애플리케이션의 마스터 볼륨을 조절합니다.
   * @param volume - 볼륨 값 (0.0 ~ 1.0)
   */
  setMasterVolume(volume: number): void;
}
