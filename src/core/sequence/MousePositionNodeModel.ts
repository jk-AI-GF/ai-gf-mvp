// src/core/sequence/MousePositionNodeModel.ts

import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";

export interface SerializedMousePositionNodeData {
    nodeType: 'MousePositionNodeModel';
}

export class MousePositionNodeModel extends BaseNode {
    constructor(id: string) {
        const outputs: IPort[] = [
            { name: 'x', type: 'number', direction: 'out' },
            { name: 'y', type: 'number', direction: 'out' },
        ];

        super(id, 'Mouse Position', [], outputs);
    }

    async execute(
        context: PluginContext,
        inputs: Record<string, any>
    ): Promise<{ outputs: Record<string, any> }> {
        const mousePosition = context.get('mousePosition') as { x: number; y: number; } | undefined;

        // Fallback to 0,0 if the value isn't set yet
        const x = mousePosition?.x ?? 0;
        const y = mousePosition?.y ?? 0;

        return {
            outputs: {
                x,
                y,
            },
        };
    }

    clone(): BaseNode {
        return new MousePositionNodeModel(this.id);
    }

    serialize(): SerializedMousePositionNodeData {
        return {
            nodeType: 'MousePositionNodeModel',
        };
    }
}