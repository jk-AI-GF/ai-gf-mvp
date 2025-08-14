import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";
import { DataProviderDefinition } from "../../plugin-api/data-providers";

export interface SerializedDataProviderNodeData {
    nodeType: 'DataProviderNodeModel';
    providerName: string;
}

export class DataProviderNodeModel extends BaseNode {
    public readonly providerDefinition: DataProviderDefinition;

    constructor(id: string, providerDefinition: DataProviderDefinition) {
        const inputs: IPort[] = [];
        const outputs: IPort[] = [];

        // 정의에 따라 입력 포트를 동적으로 생성합니다.
        providerDefinition.params.forEach(param => {
            inputs.push({
                name: param.name,
                type: param.type,
                direction: 'in',
            });
        });

        // 정의에 따라 출력 포트를 동적으로 생성합니다.
        providerDefinition.outputs.forEach(output => {
            outputs.push({
                name: output.name,
                type: output.type,
                direction: 'out',
            });
        });
        
        super(id, providerDefinition.description || providerDefinition.name, inputs, outputs);

        this.providerDefinition = providerDefinition;
    }

    /**
     * 이 노드의 출력 값을 계산하여 반환합니다.
     * SequenceEngine에 의해 필요할 때 호출됩니다.
     * @param context - 플러그인 컨텍스트
     * @param connectedInputs - 이 노드의 입력 포트에 연결된 값들
     * @returns 포트 이름과 값으로 구성된 객체
     */
    async evaluate(context: PluginContext, connectedInputs: Record<string, any>): Promise<Record<string, any>> {
        const providerName = this.providerDefinition.name;
        const providerInfo = (context as any).dataProviderRegistry.get(providerName);

        if (!providerInfo || typeof providerInfo.implementation !== 'function') {
            console.error(`Data provider "${providerName}" not found or is not a function.`);
            return {};
        }

        try {
            // 입력 파라미터를 객체 형태로 전달
            const result = await providerInfo.implementation(connectedInputs);
            
            if (typeof result === 'object' && result !== null) {
                return result;
            } else if (this.providerDefinition.outputs.length === 1) {
                const outputPortName = this.providerDefinition.outputs[0].name;
                return { [outputPortName]: result };
            } else {
                console.error(`Data provider "${providerName}" returned a single value but has multiple output ports defined.`);
                return {};
            }

        } catch (error) {
            console.error(`Error evaluating data provider "${providerName}" on node ${this.id}:`, error);
            return {};
        }
    }

    /**
     * 데이터 프로바이더 노드는 실행 흐름에 직접 관여하지 않으므로,
     * 이 메서드는 아무 작업도 수행하지 않고 빈 결과를 반환합니다.
     */
    async execute(context: PluginContext, connectedInputs: Record<string, any>): Promise<{ nextExec?: string; outputs: Record<string, any>; }> {
        return { outputs: {} };
    }

    clone(): BaseNode {
        return new DataProviderNodeModel(this.id, this.providerDefinition);
    }

    serialize(): SerializedDataProviderNodeData {
        return {
            nodeType: 'DataProviderNodeModel',
            providerName: this.providerDefinition.name,
        };
    }
}
