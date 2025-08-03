import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BranchNodeModel } from '../../../core/sequence/BranchNodeModel';
import { getPortColor } from './node-style-utils';

const BranchNode: React.FC<NodeProps<BranchNodeModel>> = ({ data }) => {
    const execInPort = data.inputs.find(p => p.name === 'exec-in');
    const conditionPort = data.inputs.find(p => p.name === 'condition');
    const execTruePort = data.outputs.find(p => p.name === 'exec-true');
    const execFalsePort = data.outputs.find(p => p.name === 'exec-false');

    return (
        <div style={{
            background: '#383838',
            color: '#ddd',
            borderRadius: '5px',
            border: '1px solid #555',
            width: 180,
            fontSize: '12px',
        }}>
            <div style={{ background: 'rgba(255, 82, 82, 0.7)', padding: '8px', fontWeight: 'bold', textAlign: 'center', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
                Branch (If)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 10px' }}>
                {/* Input Ports */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'flex-start' }}>
                    {execInPort && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Handle type="target" position={Position.Left} id={execInPort.name} style={{ top: '50%', background: getPortColor(execInPort.type) }} />
                            <span style={{ marginLeft: '15px' }}>Exec</span>
                        </div>
                    )}
                    {conditionPort && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Handle type="target" position={Position.Left} id={conditionPort.name} style={{ top: '50%', background: getPortColor(conditionPort.type) }} />
                            <span style={{ marginLeft: '15px' }}>Condition</span>
                        </div>
                    )}
                </div>

                {/* Output Ports */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'flex-end' }}>
                    {execTruePort && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '15px', color: '#81C784' }}>True</span>
                            <Handle type="source" position={Position.Right} id={execTruePort.name} style={{ top: '50%', background: getPortColor(execTruePort.type) }} />
                        </div>
                    )}
                    {execFalsePort && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '15px', color: '#E57373' }}>False</span>
                            <Handle type="source" position={Position.Right} id={execFalsePort.name} style={{ top: '50%', background: getPortColor(execFalsePort.type) }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(BranchNode);
