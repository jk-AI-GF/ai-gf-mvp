import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";

export interface SerializedRandomNodeData {
    nodeType: 'RandomNodeModel';
    min: number;
    max: number;
}

export class RandomNodeModel extends BaseNode {
    public min: number;
    public max: number;

    constructor(id: string, min: number = 0, max: number = 1) {
        const inputs: IPort[] = [
            { name: 'min', type: 'number', direction: 'in' },
            { name: 'max', type: 'number', direction: 'in' },
        ];
        const outputs: IPort[] = [
            { name: 'result', type: 'number', direction: 'out' },
        ];
        super(id, 'Random Number', inputs, outputs);
        this.min = min;
        this.max = max;
    }

    async execute(
        context: PluginContext,
        inputs: { min?: number; max?: number }
    ): Promise<{ outputs: { result: number } }> {
        const min = inputs.min ?? this.min;
        const max = inputs.max ?? this.max;
        
        const result = Math.random() * (max - min) + min;
        
        return { outputs: { result } };
    }

    clone(): BaseNode {
        return new RandomNodeModel(this.id, this.min, this.max);
    }

    serialize(): SerializedRandomNodeData {
        return {
            nodeType: 'RandomNodeModel',
            min: this.min,
            max: this.max,
        };
    }
}
