

/**
 * 액션 파라미터의 타입을 정의합니다.
 */
export type ActionParamType = 'string' | 'number' | 'boolean' | 'enum';

/**
 * 액션 파라미터의 상세 정의입니다.
 */
export interface ActionParam {
  name: string;
  type: ActionParamType;
  defaultValue?: any;
  options?: string[]; // for 'enum' type
  description?: string;
  validation?: (value: any) => boolean | string;
}

/**
 * 단일 액션의 정의입니다. UI에서 이 정보를 사용하여 동적으로 폼을 생성합니다.
 */
export interface ActionDefinition {
  name: keyof Actions;
  description: string;
  params: ActionParam[];
}

/**
 * 모드가 게임에 영향을 줄 수 있는 함수 호출을 정의하는 인터페이스입니다.
 * 이 인터페이스의 구현체는 PluginContext를 통해 모드에 노출됩니다.
 */
export interface Actions {
  /**
   * TriggerEditorPanel 등에서 사용할 수 있는 모든 액션의 목록과 명세를 반환합니다.
   */
  getAvailableActions(): Promise<ActionDefinition[]>;

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
   * VRM 모델의 개별 표정 가중치를 직접 설정합니다. (다른 표정은 그대로 둡니다)
   * @param expressionName 변경할 표정의 이름
   * @param weight 표정의 강도 (0.0 ~ 1.0)
   */
  setExpressionWeight(expressionName: string, weight: number): void;

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

  /**
   * 배경 이미지를 변경합니다.
   * @param imagePath 모드 폴더 내의 상대 경로 또는 전체 URL
   */
  changeBackground(imagePath: string): void;

  /**
   * TTS를 사용하여 문장을 말합니다.
   * @param text 말할 내용
   */
  speak(text: string): void;

  /**
   * VRM 모델의 히트박스 가시성을 설정합니다.
   * @param visible 히트박스를 표시할지 여부
   */
  setHitboxesVisible(visible: boolean): void;

  /**
   * 캐릭터의 포즈를 기본 T-Pose로 초기화합니다.
   */
  resetPose(): void;

  /**
   * 현재 캐릭터의 포즈를 파일로 저장하도록 다이얼로그를 엽니다.
   */
  saveCurrentPose(): void;

  /**
   * 지정된 파일 이름의 VRM 모델을 로드하여 캐릭터를 교체합니다.
   * @param fileName `userdata/vrm` 또는 `assets/VRM` 폴더에 있는 VRM 파일의 이름
   */
  loadCharacter(fileName: string): Promise<void>;

  /**
   * 카메라 모드를 변경합니다.
   * @param mode 'orbit' (자유 시점) 또는 'fixed' (고정 시점)
   */
  setCameraMode(mode: 'orbit' | 'fixed'): void;

  /**
   * 전역 컨텍스트 저장소에 키-값 데이터를 저장합니다.
   * @param key 저장할 데이터의 키
   * @param value 저장할 데이터
   */
  setContext(key: string, value: any): void;

  /**
   * 전역 컨텍스트 저장소에서 키에 해당하는 데이터를 가져옵니다.
   * @param key 가져올 데이터의 키
   * @returns 키에 해당하는 데이터. 없을 경우 undefined.
   */
  getContext(key: string): Promise<any>;
}

