import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DataProviderNodeModel } from '../../../core/sequence/DataProviderNodeModel';
import { IPort } from '../../../core/sequence/BaseNode';

// ActionNode.tsx에서 사용하는 스타일링 유틸리티를 여기에 직접 정의합니다.
const getPortColor = (type: IPort['type']) => {
  switch (type) {
    case 'execution': return '#ff7f7f';
    case 'string': return '#a6e22e';
    case 'number': return '#66d9ef';
    case 'boolean': return '#ae81ff';
    case 'enum': return '#f92672';
    case 'any': return '#e6db74';
    default: return '#ffffff';
  }
};

const DataProviderNode: React.FC<NodeProps<DataProviderNodeModel>> = ({ data }) => {
  if (!data) return null;

  const { name, outputs } = data;

  return (
    <div style={{
      background: '#383838',
      color: '#ddd',
      borderRadius: '5px',
      border: '1px solid #555',
      width: 250,
      fontSize: '12px',
    }}>
      <div style={{ background: '#2196F3', padding: '8px', fontWeight: 'bold', textAlign: 'center', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
        {name}
      </div>
      <div style={{ padding: '10px', textAlign: 'right' }}>
        {outputs.map((port) => (
          <div key={port.name} style={{ position: 'relative', paddingRight: '15px', height: '16px', lineHeight: '16px', marginTop: '5px', marginBottom: '5px' }}>
            <Handle
              type="source"
              position={Position.Right}
              id={port.name}
              style={{ top: '50%', background: getPortColor(port.type) }}
            />
            <span style={{ marginRight: '10px' }}>{port.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(DataProviderNode);
