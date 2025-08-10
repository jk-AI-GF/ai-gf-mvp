import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";

/**
 * 서브루틴의 입력 파라미터를 정의하는 인터페이스입니다.
 */
export interface SubroutineParameter {
  id: string;
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  defaultValue?: any;
}

/**
 * 직렬화된 Input 노드의 데이터 형식입니다.
 */
export interface SerializedInputNodeData {
    nodeType: 'InputNodeModel';
    parameters: SubroutineParameter[];
}

/**
 * 서브루틴의 시작점으로, 입력 파라미터를 정의하는 노드입니다.
 */
export class InputNodeModel extends BaseNode {
  private _parameters: SubroutineParameter[] = [];

  constructor(id: string, parameters: SubroutineParameter[] = []) {
    super(id, "Subroutine Input", [], []); // 초기 포트는 비어있음
    this._parameters = parameters;
    this.updatePorts(); // 생성자에서 포트 업데이트
  }

  // 파라미터 목록에 대한 getter
  get parameters(): SubroutineParameter[] {
    return this._parameters;
  }

  // 파라미터 추가
  addParameter(param: Omit<SubroutineParameter, "id">) {
    const newParam: SubroutineParameter = {
      ...param,
      id: `param-${Date.now()}-${Math.random()}`,
    };
    this._parameters.push(newParam);
    this.updatePorts();
  }

  // 파라미터 제거
  removeParameter(id: string) {
    this._parameters = this._parameters.filter((p) => p.id !== id);
    this.updatePorts();
  }

  // 파라미터 수정
  updateParameter(id: string, updatedParam: Partial<Omit<SubroutineParameter, 'id'>>) {
    const index = this._parameters.findIndex((p) => p.id === id);
    if (index !== -1) {
      this._parameters[index] = { ...this._parameters[index], ...updatedParam };
      this.updatePorts();
    }
  }

  /**
   * 파라미터 목록이 변경될 때마다 출력 포트를 다시 생성합니다.
   */
  private updatePorts() {
    const newOutputs: IPort[] = [
        // 모든 시작 노드는 실행 출력 포트를 가집니다.
        { name: 'execution', type: 'execution', direction: 'out' }
    ];

    this._parameters.forEach((param) => {
      newOutputs.push({
        name: param.id, // 포트 이름으로 고유 ID를 사용
        type: param.type,
        direction: 'out',
      });
    });

    this.outputs = newOutputs;
  }

  /**
   * Input 노드는 서브루틴의 일부로 외부에서 실행되므로,
   * 자체 실행 로직은 들어온 파라미터 값을 그대로 출력 포트로 전달하는 것입니다.
   */
  async execute(
    context: PluginContext,
    inputs: Record<string, any> // 외부에서 전달된 파라미터 값들
  ): Promise<{ nextExec?: string; outputs: Record<string, any> }> {
    const outputData: Record<string, any> = {};
    
    // 외부에서 받은 입력값을 각 파라미터 ID에 매핑하여 출력으로 설정
    this.parameters.forEach(param => {
        // 입력에 값이 있으면 그 값을 쓰고, 없으면 기본값을 사용
        outputData[param.id] = inputs[param.name] !== undefined ? inputs[param.name] : param.defaultValue;
    });

    return { nextExec: 'execution', outputs: outputData };
  }

  clone(): BaseNode {
    // 파라미터도 깊은 복사를 수행하여 복제
    const clonedParameters = JSON.parse(JSON.stringify(this._parameters));
    return new InputNodeModel(this.id, clonedParameters);
  }

  serialize(): SerializedInputNodeData {
    return {
      nodeType: 'InputNodeModel',
      parameters: this._parameters,
    };
  }
}