import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useStoreApi } from 'reactflow';
import { OperatorNodeModel, Operator, MathOperator, ComparisonOperator, LogicOperator, OperatorCategory } from '../../../core/sequence/OperatorNodeModel';
import { getPortColor } from './node-style-utils';

const selectStyle: React.CSSProperties = {
    width: '90%',
    background: '#2a2a2a',
    color: '#ddd',
    border: '1px solid #555',
    borderRadius: '3px',
    padding: '4px',
    fontSize: '12px',
    boxSizing: 'border-box',
    marginTop: '5px',
    marginBottom: '5px',
};

const OPERATORS_BY_CATEGORY: Record<OperatorCategory, Operator[]> = {
    math: ['+', '-', '*', '/'],
    comparison: ['==', '!=', '>', '>=', '<', '<='],
    logic: ['AND', 'OR', 'NOT'],
};

const OperatorNode: React.FC<NodeProps<OperatorNodeModel>> = ({ id, data }) => {
    const { setNodes } = useReactFlow();
    const store = useStoreApi();

    const onOperatorChange = useCallback((newOperator: Operator) => {
        const { nodeInternals } = store.getState();
        setNodes(
            Array.from(nodeInternals.values()).map((node) => {
                if (node.id === id) {
                    const newModel = node.data.clone() as OperatorNodeModel;
                    newModel.setOperator(newOperator);
                    return { ...node, data: newModel };
                }
                return node;
            })
        );
    }, [id, store, setNodes]);

    const { name, inputs, outputs, category, operator } = data;

    return (
        <div style={{
            background: '#383838',
            color: '#ddd',
            borderRadius: '5px',
            border: '1px solid #555',
            width: 200,
            fontSize: '12px',
        }}>
            <div style={{ background: '#4a4a4a', padding: '8px', fontWeight: 'bold', textAlign: 'center', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
                {name}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
                    {inputs.map(port => (
                        <div key={port.name} style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
                            <Handle type="target" position={Position.Left} id={port.name} style={{ top: 'auto', background: getPortColor(port.type) }} />
                            <span style={{ marginLeft: '15px' }}>{port.name}</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                    {outputs.map(port => (
                        <div key={port.name} style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '15px' }}>{port.name}</span>
                            <Handle type="source" position={Position.Right} id={port.name} style={{ top: 'auto', background: getPortColor(port.type) }} />
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ padding: '0 10px 10px 10px', textAlign: 'center' }}>
                 <select value={operator} onChange={(e) => onOperatorChange(e.target.value as Operator)} style={selectStyle}>
                    {OPERATORS_BY_CATEGORY[category].map(op => (
                        <option key={op} value={op}>{op}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default memo(OperatorNode);
