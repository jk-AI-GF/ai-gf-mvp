import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";

export interface SerializedDelayNodeData {
    nodeType: 'DelayNodeModel';
    delay: number;
}

export class DelayNodeModel extends BaseNode {
    public delay: number; // 기본 지연 시간(초)

    constructor(id: string, delay: number = 1.0) {
        const inputs: IPort[] = [
            { name: 'exec-in', type: 'execution', direction: 'in' },
            { name: 'delay', type: 'number', direction: 'in' }
        ];
        const outputs: IPort[] = [
            { name: 'exec-out', type: 'execution', direction: 'out' }
        ];

        super(id, 'Delay', inputs, outputs);
        this.delay = delay;
    }

    async execute(
        context: PluginContext,
        inputs: { delay?: number }
    ): Promise<{ nextExec?: string; outputs: Record<string, any> }> {
        // 데이터 흐름으로 연결된 값이 있으면 그것을 사용하고, 없으면 노드의 기본값을 사용
        const delayInSeconds = inputs.delay ?? this.delay;

        console.log(`[DelayNode] Delaying execution for ${delayInSeconds} seconds.`);

        return new Promise(resolve => {
            setTimeout(() => {
                console.log(`[DelayNode] Delay finished.`);
                resolve({ nextExec: 'exec-out', outputs: {} });
            }, delayInSeconds * 1000);
        });
    }

    clone(): BaseNode {
        return new DelayNodeModel(this.id, this.delay);
    }

    serialize(): SerializedDelayNodeData {
        return {
            nodeType: 'DelayNodeModel',
            delay: this.delay,
        };
    }
}
