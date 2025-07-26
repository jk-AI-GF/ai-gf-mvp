/**
 * 모드가 시스템 수준의 기능을 제어할 수 있는 인터페이스입니다.
 */
export interface SystemControls {
  /**
   * TTS(Text-to-Speech) 기능을 활성화하거나 비활성화합니다.
   * @param enable TTS 기능을 활성화할지(true) 비활성화할지(false) 여부.
   */
  toggleTts(enable: boolean): void;

  /**
   * 애플리케이션의 마스터 볼륨을 설정합니다.
   * @param volume 볼륨 값 (0.0에서 1.0 사이).
   */
  setMasterVolume(volume: number): void;
}
