import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useStoreApi } from 'reactflow';
import { DelayNodeModel } from '../../../core/sequence/DelayNodeModel';
import { getPortColor } from './node-style-utils';

const inputStyle: React.CSSProperties = {
    width: '60px',
    background: '#2a2a2a',
    color: '#ddd',
    border: '1px solid #555',
    borderRadius: '3px',
    padding: '4px',
    fontSize: '12px',
    textAlign: 'center',
    boxSizing: 'border-box',
};

const DelayNode: React.FC<NodeProps<DelayNodeModel>> = ({ id, data }) => {
    const { setNodes } = useReactFlow();
    const store = useStoreApi();

    const onDelayChange = useCallback((newDelay: number) => {
        const { nodeInternals } = store.getState();
        setNodes(
            Array.from(nodeInternals.values()).map((node) => {
                if (node.id === id) {
                    const newModel = node.data.clone() as DelayNodeModel;
                    newModel.delay = newDelay;
                    return { ...node, data: newModel };
                }
                return node;
            })
        );
    }, [id, store, setNodes]);

    const execInPort = data.inputs.find(p => p.type === 'execution');
    const delayPort = data.inputs.find(p => p.type === 'number');
    const execOutPort = data.outputs.find(p => p.type === 'execution');

    return (
        <div style={{
            background: '#383838',
            color: '#ddd',
            borderRadius: '5px',
            border: '1px solid #555',
            width: 180,
            fontSize: '12px',
        }}>
            <div style={{ background: 'rgba(255, 152, 0, 0.7)', padding: '8px', fontWeight: 'bold', textAlign: 'center', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
                Delay
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 10px' }}>
                {/* Input Ports */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
                    {execInPort && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Handle type="target" position={Position.Left} id={execInPort.name} style={{ top: '50%', background: getPortColor(execInPort.type) }} />
                            <span style={{ marginLeft: '15px' }}>Exec</span>
                        </div>
                    )}
                    {delayPort && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Handle type="target" position={Position.Left} id={delayPort.name} style={{ top: '50%', background: getPortColor(delayPort.type) }} />
                            <span style={{ marginLeft: '15px' }}>Delay (s)</span>
                        </div>
                    )}
                </div>

                {/* Unconnected Input Field */}
                <input
                    type="number"
                    value={data.delay}
                    onChange={(e) => onDelayChange(parseFloat(e.target.value) || 0)}
                    style={inputStyle}
                    title="Default delay in seconds"
                />

                {/* Output Ports */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                    {execOutPort && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '15px' }}>Exec</span>
                            <Handle type="source" position={Position.Right} id={execOutPort.name} style={{ top: '50%', background: getPortColor(execOutPort.type) }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(DelayNode);
