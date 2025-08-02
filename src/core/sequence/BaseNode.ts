import { PluginContext } from "../../plugin-api/plugin-context";

/**
 * 노드의 입/출력 포트를 정의하는 인터페이스입니다.
 */
export interface IPort {
    name: string;
    // 'execution'은 실행 흐름, 나머지는 데이터 타입을 나타냅니다.
    // ActionParamType을 포함하도록 확장되었습니다.
    type: 'execution' | 'string' | 'number' | 'boolean' | 'enum' | 'any';
    // 'in'은 입력, 'out'은 출력 포트를 의미합니다.
    direction: 'in' | 'out';
    // enum 타입일 경우, 선택 가능한 옵션
    options?: string[];
}

/**
 * 모든 시퀀스 노드의 기반이 되는 추상 클래스입니다.
 */
export abstract class BaseNode {
    id: string;
    name: string;
    inputs: IPort[];
    outputs: IPort[];

    constructor(id: string, name: string, inputs: IPort[], outputs: IPort[]) {
        this.id = id;
        this.name = name;
        this.inputs = inputs;
        this.outputs = outputs;
    }

    /**
     * 노드의 핵심 로직을 실행합니다.
     * @param context 플러그인 컨텍스트 (시스템 API 접근용)
     * @param inputs 다른 노드로부터 연결된 입력 데이터 값들의 맵
     * @returns 실행 결과. 다음으로 이어질 실행 포트 이름과, 이 노드가 생성한 출력 데이터 값들의 맵을 포함합니다.
     */
    abstract execute(
        context: PluginContext,
        inputs: Record<string, any>
    ): Promise<{ nextExec?: string; outputs: Record<string, any> }>;

    /**
     * 현재 노드의 모든 상태를 복사한 새로운 인스턴스를 반환합니다.
     */
    abstract clone(): BaseNode;

    /**
     * 노드의 상태를 직렬화 가능한 객체로 변환합니다.
     */
    abstract serialize(): object;
}