import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";
import { EventDefinition } from "../event-definitions";

export interface SerializedEventNodeData {
    nodeType: 'EventNodeModel';
    eventName: string;
}

export class EventNodeModel extends BaseNode {
    public readonly eventDefinition: EventDefinition;

    constructor(id: string, eventDefinition: EventDefinition) {
        const outputs: IPort[] = [
            { name: 'exec-out', type: 'execution', direction: 'out' }
        ];

        // 이벤트 페이로드 스키마를 기반으로 데이터 출력 포트를 추가합니다.
        eventDefinition.payloadSchema.forEach(item => {
            outputs.push({
                name: item.key,      // 포트 이름 (예: 'text')
                type: item.type,     // 포트 타입 (예: 'string')
                direction: 'out'
            });
        });

        super(id, eventDefinition.description || eventDefinition.name, [], outputs);
        this.eventDefinition = eventDefinition;
    }

    get eventName(): string {
        return this.eventDefinition.name;
    }

    /**
     * 이벤트 노드는 직접 실행되지 않습니다.
     * SequenceEngine이 이 노드를 보고 eventBus를 구독하며, 이벤트 발생 시 이 execute를 호출합니다.
     * @param context 플러그인 컨텍스트
     * @param payload 이벤트 버스로부터 받은 실제 데이터 페이로드
     * @returns 
     */
    async execute(
        context: PluginContext,
        payload: Record<string, any>
    ): Promise<{ nextExec?: string; outputs: Record<string, any> }> {
        // 페이로드 데이터를 각 출력 포트에 매핑합니다.
        const outputs: Record<string, any> = {};
        if (payload && typeof payload === 'object') {
            this.eventDefinition.payloadSchema.forEach(item => {
                if (item.key in payload) {
                    outputs[item.key] = payload[item.key];
                }
            });
        }

        // 다음 노드로 실행 흐름과 함께, 분해된 데이터(outputs)를 전달합니다.
        return { nextExec: 'exec-out', outputs };
    }

    clone(): BaseNode {
        return new EventNodeModel(this.id, this.eventDefinition);
    }

    serialize(): SerializedEventNodeData {
        return {
            nodeType: 'EventNodeModel',
            eventName: this.eventName,
        };
    }
}
