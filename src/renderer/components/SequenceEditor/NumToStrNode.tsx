import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NumToStrNodeModel } from '../../../core/sequence/NumToStrNodeModel';
import { getPortColor } from './node-style-utils';

const NumToStrNode: React.FC<NodeProps<NumToStrNodeModel>> = ({ data }) => {
    const inPort = data.inputs[0];
    const outPort = data.outputs[0];

    return (
        <div style={{
            background: '#383838',
            color: '#ddd',
            borderRadius: '5px',
            border: '1px solid #555',
            width: 180,
            fontSize: '12px',
        }}>
            <div style={{ background: 'rgba(33, 150, 243, 0.7)', padding: '8px', fontWeight: 'bold', textAlign: 'center', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
                Number to String
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 10px' }}>
                {/* Input Port */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Handle type="target" position={Position.Left} id={inPort.name} style={{ top: '50%', background: getPortColor(inPort.type) }} />
                    <span style={{ marginLeft: '15px' }}>Number</span>
                </div>

                {/* Output Port */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '15px' }}>String</span>
                    <Handle type="source" position={Position.Right} id={outPort.name} style={{ top: '50%', background: getPortColor(outPort.type) }} />
                </div>
            </div>
        </div>
    );
};

export default memo(NumToStrNode);