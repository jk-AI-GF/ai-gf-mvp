import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";
import { ActionDefinition } from "../../plugin-api/actions";

export class ActionNodeModel extends BaseNode {
    public readonly actionDefinition: ActionDefinition;
    // 노드 내부에 저장될 파라미터 값
    public paramValues: Record<string, any> = {};

    constructor(id: string, actionDefinition: ActionDefinition) {
        const inputs: IPort[] = [
            { name: 'exec-in', type: 'execution', direction: 'in' }
        ];
        const outputs: IPort[] = [
            { name: 'exec-out', type: 'execution', direction: 'out' }
        ];

        if (actionDefinition.params) {
            actionDefinition.params.forEach(param => {
                inputs.push({
                    name: param.name,
                    type: param.type,
                    direction: 'in'
                });
                // 파라미터의 기본값으로 paramValues 초기화
                this.paramValues[param.name] = param.defaultValue ?? this.getDefaultValueForType(param.type);
            });
        }
        
        super(id, actionDefinition.description || actionDefinition.name, inputs, outputs);
        this.actionDefinition = actionDefinition;
    }

    /**
     * UI에서 파라미터 값을 변경할 때 호출됩니다.
     */
    setParamValue(name: string, value: any) {
        this.paramValues[name] = value;
    }

    private getDefaultValueForType(type: IPort['type']) {
        switch (type) {
            case 'string': return '';
            case 'number': return 0;
            case 'boolean': return false;
            default: return null;
        }
    }

    async execute(
        context: PluginContext,
        // `inputs`는 이제 데이터 흐름으로 연결된 값만 포함합니다.
        // 연결되지 않은 값은 this.paramValues를 사용합니다.
        connectedInputs: Record<string, any>
    ): Promise<{ nextExec?: string; outputs: Record<string, any> }> {
        const actionName = this.actionDefinition.name;
        const action = (context.actions as any)[actionName];

        if (typeof action !== 'function') {
            console.error(`Action "${actionName}" not found in PluginContext.`);
            return { outputs: {} };
        }

        // 최종 파라미터 계산: 연결된 입력값이 있으면 그것을 사용하고, 없으면 내장된 값을 사용
        const finalParams = { ...this.paramValues, ...connectedInputs };

        console.log(`Executing action: ${actionName} with final params:`, finalParams);
        try {
            await action(finalParams);
        } catch (error) {
            console.error(`Error executing action "${actionName}" on node ${this.id}:`, error);
        }

        return { nextExec: 'exec-out', outputs: {} };
    }
}
