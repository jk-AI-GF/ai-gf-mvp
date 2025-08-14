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
        // 데이터 프로바이더 노드는 실행 포트나 입력 데이터 포트가 없습니다.
        const inputs: IPort[] = []; 
        const outputs: IPort[] = [];

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
     * @returns 포트 이름과 값으로 구성된 객체
     */
    async evaluate(context: PluginContext): Promise<Record<string, any>> {
        const providerName = this.providerDefinition.name;
        // TODO: 컨텍스트에서 dataProviderRegistry를 가져와야 합니다.
        // const providerInfo = context.dataProviderRegistry.get(providerName);
        const providerInfo = (context as any).dataProviderRegistry.get(providerName);


        if (!providerInfo || typeof providerInfo.implementation !== 'function') {
            console.error(`Data provider "${providerName}" not found or is not a function.`);
            return {};
        }

        try {
            const result = await providerInfo.implementation();
            
            // 반환된 결과가 객체이면, 출력 포트 이름에 맞게 값을 매핑합니다.
            if (typeof result === 'object' && result !== null) {
                return result;
            } else if (this.providerDefinition.outputs.length === 1) {
                // 단일 값 반환 및 단일 출력 포트인 경우
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
     * BaseNode의 추상 메서드를 구현합니다.
     * 데이터 프로바이더 노드는 실행 흐름에 직접 관여하지 않으므로,
     * 이 메서드는 아무 작업도 수행하지 않고 빈 결과를 반환합니다.
     */
    async execute(context: PluginContext, connectedInputs: Record<string, any>): Promise<{ nextExec?: string; outputs: Record<string, any>; }> {
        // 데이터 노드는 실행되지 않으므로 항상 빈 결과를 반환합니다.
        // 실제 데이터 계산은 evaluate() 메서드에서 수행됩니다.
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
