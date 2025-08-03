import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";

export type OperatorCategory = 'math' | 'comparison' | 'logic';

export type MathOperator = '+' | '-' | '*' | '/';
export type ComparisonOperator = '==' | '!=' | '>' | '>=' | '<' | '<=';
export type LogicOperator = 'AND' | 'OR' | 'NOT';

export type Operator = MathOperator | ComparisonOperator | LogicOperator;

export interface SerializedOperatorNodeData {
    nodeType: 'OperatorNodeModel';
    category: OperatorCategory;
    operator: Operator;
}

// IPort['type']을 사용하여 IPort의 type 속성과 동일한 타입을 사용하도록 명시
type PortType = IPort['type'];

interface OperatorConfig {
    inputs: { name: string; type: PortType }[];
    output: { name: string; type: PortType };
}

const OPERATOR_CONFIG: Record<Operator, OperatorConfig> = {
    // Math
    '+': { inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], output: { name: 'result', type: 'number' } },
    '-': { inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], output: { name: 'result', type: 'number' } },
    '*': { inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], output: { name: 'result', type: 'number' } },
    '/': { inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], output: { name: 'result', type: 'number' } },
    // Comparison
    '==': { inputs: [{ name: 'a', type: 'any' }, { name: 'b', type: 'any' }], output: { name: 'result', type: 'boolean' } },
    '!=': { inputs: [{ name: 'a', type: 'any' }, { name: 'b', type: 'any' }], output: { name: 'result', type: 'boolean' } },
    '>': { inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], output: { name: 'result', type: 'boolean' } },
    '>=': { inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], output: { name: 'result', type: 'boolean' } },
    '<': { inputs: [{ name: 'a', type: 'number' }, { name: 'b', 'type': 'number' }], output: { name: 'result', type: 'boolean' } },
    '<=': { inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], output: { name: 'result', type: 'boolean' } },
    // Logic
    'AND': { inputs: [{ name: 'a', type: 'boolean' }, { name: 'b', type: 'boolean' }], output: { name: 'result', type: 'boolean' } },
    'OR': { inputs: [{ name: 'a', type: 'boolean' }, { name: 'b', type: 'boolean' }], output: { name: 'result', type: 'boolean' } },
    'NOT': { inputs: [{ name: 'a', type: 'boolean' }], output: { name: 'result', type: 'boolean' } },
};

export class OperatorNodeModel extends BaseNode {
    public category: OperatorCategory;
    public operator: Operator;

    constructor(id: string, category: OperatorCategory, operator: Operator) {
        super(id, 'Operator', [], []);
        this.category = category;
        this.operator = operator;
        this.updatePorts();
    }

    private updatePorts(): void {
        const config = OPERATOR_CONFIG[this.operator];
        this.name = `Operator: ${this.operator}`;
        this.inputs = config.inputs.map(i => ({ ...i, direction: 'in' }));
        this.outputs = [{ ...config.output, direction: 'out' }];
    }

    setOperator(operator: Operator) {
        this.operator = operator;
        this.updatePorts();
    }

    async execute(context: PluginContext, inputs: Record<string, any>): Promise<{ outputs: Record<string, any> }> {
        const { a, b } = inputs;
        let result: any;

        switch (this.operator) {
            // Math
            case '+': result = a + b; break;
            case '-': result = a - b; break;
            case '*': result = a * b; break;
            case '/': result = a / b; break;
            // Comparison
            case '==': result = a == b; break;
            case '!=': result = a != b; break;
            case '>': result = a > b; break;
            case '>=': result = a >= b; break;
            case '<': result = a < b; break;
            case '<=': result = a <= b; break;
            // Logic
            case 'AND': result = a && b; break;
            case 'OR': result = a || b; break;
            case 'NOT': result = !a; break;
            default:
                console.error(`Unknown operator: ${this.operator}`);
                result = null;
        }

        return { outputs: { result } };
    }

    clone(): BaseNode {
        return new OperatorNodeModel(this.id, this.category, this.operator);
    }

    serialize(): SerializedOperatorNodeData {
        return {
            nodeType: 'OperatorNodeModel',
            category: this.category,
            operator: this.operator,
        };
    }
}
