

/**
 * 액션 실행 함수의 제네릭 타입입니다.
 * 모든 액션 함수는 이 타입을 따릅니다.
 */
export type ActionImplementation = (...args: any[]) => any;

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
  dynamicOptions?: 'animations' | string; // UI 힌트: 이 파라미터의 옵션을 동적으로 가져와야 함
}

/**
 * 액션이 반환할 수 있는 데이터 타입을 정의합니다.
 */
export type ActionReturnType = 'string' | 'number' | 'boolean' | 'any';

/**
 * 단일 액션의 정의입니다. UI에서 이 정보를 사용하여 동적으로 폼을 생성합니다.
 */
export interface ActionDefinition {
  name: string; // keyof Actions 대신 string으로 변경
  description: string;
  params: ActionParam[];
  returnType?: ActionReturnType; // 액션의 반환 값 타입
}

/**
 * 모드가 게임에 영향을 줄 수 있는 함수 호출을 정의하는 인터페이스입니다.
 * 이 인터페이스는 ActionRegistry에 의해 동적으로 구현됩니다.
 */
export interface Actions {
  /**
   * TriggerEditorPanel 등에서 사용할 수 있는 모든 액션의 목록과 명세를 반환합니다.
   */
  getAvailableActions(): Promise<ActionDefinition[]>;

  // 다른 액션들은 ActionRegistry를 통해 동적으로 추가되므로,
  // 여기서는 인덱스 시그니처를 사용하여 어떤 문자열 키의 함수든 올 수 있음을 명시합니다.
  [key: string]: ActionImplementation;
}


