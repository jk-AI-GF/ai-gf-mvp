import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";

export interface SerializedNumToStrNodeData {
    nodeType: 'NumToStrNodeModel';
}

export class NumToStrNodeModel extends BaseNode {
    constructor(id: string) {
        const inputs: IPort[] = [
            { name: 'in', type: 'number', direction: 'in' },
        ];
        const outputs: IPort[] = [
            { name: 'out', type: 'string', direction: 'out' },
        ];
        super(id, 'Number to String', inputs, outputs);
    }

    async execute(
        context: PluginContext,
        inputs: { in?: number }
    ): Promise<{ outputs: { out: string } }> {
        const numberInput = inputs.in ?? 0;
        const stringOutput = String(numberInput);
        
        return { outputs: { out: stringOutput } };
    }

    clone(): BaseNode {
        return new NumToStrNodeModel(this.id);
    }

    serialize(): SerializedNumToStrNodeData {
        return {
            nodeType: 'NumToStrNodeModel',
        };
    }
}