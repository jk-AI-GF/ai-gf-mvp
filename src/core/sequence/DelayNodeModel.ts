import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";

export interface SerializedDelayNodeData {
    nodeType: 'DelayNodeModel';
    delay: number;
}

export class DelayNodeModel extends BaseNode {
    public delay: number; // 기본 지연 시간(초)
    private activeTimers: Set<NodeJS.Timeout> = new Set();

    constructor(id: string, delay = 1.0) {
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

    onDeactivate = (): void => {
        console.log(`[DelayNode] Deactivating and clearing ${this.activeTimers.size} active timer(s) for node ${this.id}.`);
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers.clear();
    }

    async execute(
        context: PluginContext,
        inputs: { delay?: number }
    ): Promise<{ nextExec?: string; outputs: Record<string, any> }> {
        // 데이터 흐름으로 연결된 값이 있으면 그것을 사용하고, 없으면 노드의 기본값을 사용
        const delayInSeconds = inputs.delay ?? this.delay;

        console.log(`[DelayNode] Delaying execution for ${delayInSeconds} seconds.`);

        return new Promise(resolve => {
            const timerId = setTimeout(() => {
                console.log(`[DelayNode] Delay finished.`);
                this.activeTimers.delete(timerId);
                resolve({ nextExec: 'exec-out', outputs: {} });
            }, delayInSeconds * 1000);
            this.activeTimers.add(timerId);
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
