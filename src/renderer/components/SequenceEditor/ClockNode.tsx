import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useStoreApi } from 'reactflow';
import { ClockNodeModel } from '../../../core/sequence/ClockNodeModel';
import { getPortColor } from './node-style-utils';

const inputStyle: React.CSSProperties = {
    width: '80px',
    background: '#2a2a2a',
    color: '#ddd',
    border: '1px solid #555',
    borderRadius: '3px',
    padding: '4px',
    fontSize: '12px',
    textAlign: 'center',
    boxSizing: 'border-box',
};

const ClockNode: React.FC<NodeProps<ClockNodeModel>> = ({ id, data }) => {
    const { setNodes } = useReactFlow();
    const store = useStoreApi();

    const onIntervalChange = useCallback((newInterval: number) => {
        const { nodeInternals } = store.getState();
        setNodes(
            Array.from(nodeInternals.values()).map((node) => {
                if (node.id === id) {
                    // Important: clone the data object to ensure React Flow detects the change
                    const newModel = node.data.clone() as ClockNodeModel;
                    newModel.interval = newInterval;
                    return { ...node, data: newModel };
                }
                return node;
            })
        );
    }, [id, store, setNodes]);

    const intervalPort = data.inputs.find(p => p.type === 'number');
    const execOutPort = data.outputs.find(p => p.type === 'execution');

    return (
        <div style={{
            background: '#383838',
            color: '#ddd',
            borderRadius: '5px',
            border: '1px solid #555',
            width: 200,
            fontSize: '12px',
        }}>
            <div style={{ background: 'rgba(33, 150, 243, 0.7)', padding: '8px', fontWeight: 'bold', textAlign: 'center', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
                Clock
            </div>
            <div style={{ padding: '15px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Input Port */}
                    {intervalPort && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Handle type="target" position={Position.Left} id={intervalPort.name} style={{ top: '50%', background: getPortColor(intervalPort.type) }} />
                            <span style={{ marginLeft: '15px' }}>Interval (s)</span>
                        </div>
                    )}

                    {/* Output Port */}
                    {execOutPort && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '15px' }}>Exec</span>
                            <Handle type="source" position={Position.Right} id={execOutPort.name} style={{ top: '50%', background: getPortColor(execOutPort.type) }} />
                        </div>
                    )}
                </div>
                <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <input
                        type="number"
                        value={data.interval}
                        onChange={(e) => onIntervalChange(parseFloat(e.target.value) || 0)}
                        style={inputStyle}
                        title="Default interval in seconds"
                        min="0.1"
                        step="0.1"
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(ClockNode);