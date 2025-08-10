/**
 * 표준화된 서브루틴 메타데이터 구조를 정의합니다.
 */
export interface SubroutineParameter {
  /** 파라미터 이름 */
  name: string;
  /** 파라미터 타입 */
  type: 'string' | 'number' | 'boolean';
  /** LLM이 파라미터의 용도를 이해하도록 돕는 설명 */
  description: string;
}

/**
 * LLM이 호출하고 실행할 수 있는 서브루틴의 정의입니다.
 */
export interface SubroutineDefinition {
  /** LLM이 호출할 이름 (예: "move_aside") */
  name: string;
  /** 서브루틴의 기능에 대한 자연어 설명 */
  description: string;
  /** 서브루틴에 전달할 파라미터 목록 */
  parameters: SubroutineParameter[];

  // --- 캐릭터 상태 및 리소스 잠금 관리 용 메타데이터 ---
  /** 실행 전 요구되는 캐릭터 상태 (예: ["is_standing"]) */
  capabilities: string[];
  /** 실행 중 점유할 리소스 (예: ["legs","body"]) */
  locks: string[];
}