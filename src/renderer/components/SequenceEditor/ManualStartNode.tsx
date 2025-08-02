import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ManualStartNodeModel } from '../../../core/sequence/ManualStartNodeModel';

const ManualStartNode: React.FC<NodeProps<ManualStartNodeModel>> = ({ data }) => {
  // data는 이제 ManualStartNodeModel의 인스턴스입니다.
  if (!data) return null;

  return (
    <div style={{
      background: '#2E7D32', // A distinct green color
      color: 'white',
      padding: '10px 15px',
      borderRadius: '8px',
      border: '1px solid #1B5E20',
      fontSize: '14px',
      textAlign: 'center',
      width: 150,
    }}>
      <strong>{data.name}</strong>
      {/* 모델의 outputs 배열을 기반으로 포트를 동적으로 렌더링합니다. */}
      {data.outputs.map(port => (
        <Handle
          key={port.name}
          type="source"
          position={Position.Right}
          id={port.name}
          style={{
            background: '#ffffff', // White for execution flow
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            border: '2px solid #2E7D32',
          }}
        />
      ))}
    </div>
  );
};

export default memo(ManualStartNode);
