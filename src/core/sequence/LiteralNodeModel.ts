import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";
import { ActionReturnType } from "../../plugin-api/actions";

export interface SerializedLiteralNodeData {
    nodeType: 'LiteralNodeModel';
    dataType: ActionReturnType;
    value: any;
}

export class LiteralNodeModel extends BaseNode {
    public dataType: ActionReturnType;
    public value: any;

    constructor(id: string, initialType: ActionReturnType = 'string', initialValue: any = '') {
        const outputs: IPort[] = [
            { name: 'returnValue', type: initialType, direction: 'out' }
        ];

        super(id, 'Literal Value', [], outputs);

        this.dataType = initialType;
        this.value = initialValue;
        this.updateOutputPortType();
    }

    private updateOutputPortType(): void {
        // 불변성을 유지하기 위해, 타입이 변경된 새로운 출력 포트 배열을 생성합니다.
        this.outputs = this.outputs.map(port => {
            if (port.name === 'returnValue') {
                return { ...port, type: this.dataType };
            }
            return port;
        });
    }

    setValue(value: any) {
        this.value = value;
    }

    setDataType(type: ActionReturnType) {
        this.dataType = type;
        // 타입이 변경되면 기본값으로 리셋
        switch (type) {
            case 'string':
                this.value = '';
                break;
            case 'number':
                this.value = 0;
                break;
            case 'boolean':
                this.value = false;
                break;
            default:
                this.value = null;
        }
        this.updateOutputPortType();
    }

    async execute(
        context: PluginContext,
        inputs: Record<string, any>
    ): Promise<{ outputs: Record<string, any> }> {
        // Literal 노드는 입력이 없으며, 저장된 값을 바로 출력합니다.
        return {
            outputs: {
                returnValue: this.value,
            },
        };
    }

    clone(): BaseNode {
        const newInstance = new LiteralNodeModel(this.id, this.dataType, this.value);
        newInstance.value = JSON.parse(JSON.stringify(this.value));
        return newInstance;
    }

    serialize(): SerializedLiteralNodeData {
        return {
            nodeType: 'LiteralNodeModel',
            dataType: this.dataType,
            value: this.value,
        };
    }
}
