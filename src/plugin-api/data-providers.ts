import { ActionParam, ActionParamType } from "./actions";

/**
 * 데이터 프로바이더 함수의 제네릭 타입입니다.
 */
export type DataProviderImplementation = (...args: any[]) => any;

/**
 * 데이터 프로바이더의 출력 포트 정의입니다.
 */
export interface DataProviderOutput {
  name: string;
  type: ActionParamType;
  description?: string;
}

/**
 * 데이터 프로바이더의 전체 정의입니다.
 */
export interface DataProviderDefinition {
  name: string;
  description: string;
  params: ActionParam[]; // 향후 입력을 받는 데이터 노드를 위해 유지
  outputs: DataProviderOutput[];
}
