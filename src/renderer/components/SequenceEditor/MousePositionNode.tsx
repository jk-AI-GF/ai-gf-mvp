// src/renderer/components/SequenceEditor/MousePositionNode.tsx

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MousePositionNodeModel } from '../../../core/sequence/MousePositionNodeModel';
import { getPortColor } from './node-style-utils';

const MousePositionNode: React.FC<NodeProps<MousePositionNodeModel>> = ({ data }) => {
    const xPort = data.outputs.find(p => p.name === 'x');
    const yPort = data.outputs.find(p => p.name === 'y');

    return (
        <div style={{
            background: '#383838',
            color: '#ddd',
            borderRadius: '5px',
            border: '1px solid #555',
            width: 180,
            fontSize: '12px',
        }}>
            <div style={{ background: 'rgba(156, 39, 176, 0.7)', padding: '8px', fontWeight: 'bold', textAlign: 'center', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
                Mouse Position
            </div>
            <div style={{ padding: '15px 10px' }}>
                {/* Output Ports */}
                {xPort && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ marginRight: '15px' }}>X</span>
                        <Handle type="source" position={Position.Right} id={xPort.name} style={{ top: 'auto', background: getPortColor(xPort.type) }} />
                    </div>
                )}
                {yPort && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <span style={{ marginRight: '15px' }}>Y</span>
                        <Handle type="source" position={Position.Right} id={yPort.name} style={{ top: 'auto', background: getPortColor(yPort.type) }} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(MousePositionNode);