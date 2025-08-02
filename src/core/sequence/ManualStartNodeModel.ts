import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";

export class ManualStartNodeModel extends BaseNode {
    constructor(id: string) {
        const outputs: IPort[] = [
            { name: 'exec-out', type: 'execution', direction: 'out' }
        ];
        super(id, 'Manual Start', [], outputs);
    }

    async execute(
        context: PluginContext,
        inputs: Record<string, any>
    ): Promise<{ nextExec?: string; outputs: Record<string, any> }> {
        // 이 노드는 실행 흐름을 시작시키기만 합니다.
        // 별도의 데이터를 생성하지 않고, 'exec-out' 포트로 실행 신호를 보냅니다.
        return { nextExec: 'exec-out', outputs: {} };
    }
}
