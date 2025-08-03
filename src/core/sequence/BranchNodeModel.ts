import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";

export interface SerializedBranchNodeData {
    nodeType: 'BranchNodeModel';
}

export class BranchNodeModel extends BaseNode {
    constructor(id: string) {
        const inputs: IPort[] = [
            { name: 'exec-in', type: 'execution', direction: 'in' },
            { name: 'condition', type: 'boolean', direction: 'in' }
        ];
        const outputs: IPort[] = [
            { name: 'exec-true', type: 'execution', direction: 'out' },
            { name: 'exec-false', type: 'execution', direction: 'out' }
        ];

        super(id, 'Branch (If)', inputs, outputs);
    }

    async execute(
        context: PluginContext,
        inputs: { condition?: boolean }
    ): Promise<{ nextExec?: string; outputs: Record<string, any> }> {
        const condition = inputs.condition ?? false; // 입력이 없으면 false로 간주

        console.log(`[BranchNode] Condition is ${condition}.`);

        if (condition) {
            return { nextExec: 'exec-true', outputs: {} };
        } else {
            return { nextExec: 'exec-false', outputs: {} };
        }
    }

    clone(): BaseNode {
        return new BranchNodeModel(this.id);
    }

    serialize(): SerializedBranchNodeData {
        return {
            nodeType: 'BranchNodeModel',
        };
    }
}
