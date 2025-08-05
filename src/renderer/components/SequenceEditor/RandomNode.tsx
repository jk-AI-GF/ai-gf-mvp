import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useStoreApi } from 'reactflow';
import { RandomNodeModel } from '../../../core/sequence/RandomNodeModel';
import { getPortColor } from './node-style-utils';

const nodeStyle: React.CSSProperties = {
    background: '#383838',
    color: '#ddd',
    borderRadius: '5px',
    border: '1px solid #555',
    width: 200,
    fontSize: '12px',
};

const titleStyle: React.CSSProperties = {
    background: '#4a4a4a',
    padding: '8px',
    fontWeight: 'bold',
    textAlign: 'center',
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px',
};

const contentStyle: React.CSSProperties = {
    padding: '10px',
};

const portContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    padding: '5px 10px',
};

const portLabelStyle: React.CSSProperties = {
    flex: 1,
};

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

const RandomNode: React.FC<NodeProps<RandomNodeModel>> = ({ id, data }) => {
    const { setNodes } = useReactFlow();
    const store = useStoreApi();

    const onValueChange = useCallback((key: 'min' | 'max', value: number) => {
        const { nodeInternals } = store.getState();
        setNodes(
            Array.from(nodeInternals.values()).map((node) => {
                if (node.id === id) {
                    const newModel = node.data.clone() as RandomNodeModel;
                    newModel[key] = value;
                    return { ...node, data: newModel };
                }
                return node;
            })
        );
    }, [id, store, setNodes]);

    return (
        <div style={nodeStyle}>
            <div style={titleStyle}>{data.name}</div>
            <div style={contentStyle}>
                {/* Input Section */}
                <div style={portContainerStyle}>
                    <Handle type="target" position={Position.Left} id="min" style={{ background: getPortColor('number'), left: -6 }} />
                    <span style={portLabelStyle}>Min</span>
                    <input
                        type="number"
                        value={data.min}
                        onChange={(e) => onValueChange('min', parseFloat(e.target.value) || 0)}
                        style={inputStyle}
                        title="Minimum value"
                    />
                </div>
                <div style={portContainerStyle}>
                    <Handle type="target" position={Position.Left} id="max" style={{ background: getPortColor('number'), left: -6 }} />
                    <span style={portLabelStyle}>Max</span>
                    <input
                        type="number"
                        value={data.max}
                        onChange={(e) => onValueChange('max', parseFloat(e.target.value) || 0)}
                        style={inputStyle}
                        title="Maximum value"
                    />
                </div>

                <hr style={{ borderColor: '#444', margin: '10px 0' }} />

                {/* Output Section */}
                <div style={portContainerStyle}>
                    <span style={portLabelStyle}>Result</span>
                    <Handle type="source" position={Position.Right} id="result" style={{ background: getPortColor('number'), right: -6 }} />
                </div>
            </div>
        </div>
    );
};

export default memo(RandomNode);

