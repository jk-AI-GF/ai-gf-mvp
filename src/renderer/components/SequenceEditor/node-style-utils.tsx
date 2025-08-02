import React from 'react';
import { Handle, Position } from 'reactflow';
import { IPort } from '../../../core/sequence/BaseNode';

// 이 함수는 ActionNode에서 직접 사용됩니다.
export const getPortColor = (type: IPort['type']): string => {
  const colors: Record<IPort['type'], string> = {
    execution: '#ffffff',
    string: '#00ff00',
    number: '#ff00ff',
    boolean: '#ff0000',
    enum: '#00ffff',
    any: '#aaaaaa',
  };
  return colors[type] || '#aaaaaa';
};

// 이 함수는 EventNode와 같이 간단한 노드에서 사용됩니다.
export const renderHandles = (ports: IPort[], position: Position) => {
  return ports.map((port, index) => (
    <div key={port.name} className="port" style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center', justifyContent: position === 'left' ? 'flex-start' : 'flex-end' }}>
      {position === Position.Left && (
        <>
          <Handle
            type="target"
            position={position}
            id={port.name}
            style={{ position: 'absolute', left: '-7.5px', top: '50%', transform: 'translateY(-50%)', background: getPortColor(port.type) }}
          />
          <span className="port-label" style={{ marginLeft: '15px' }}>{port.name}</span>
        </>
      )}
      {position === Position.Right && (
        <>
          <span className="port-label" style={{ marginRight: '15px' }}>{port.name}</span>
          <Handle
            type="source"
            position={position}
            id={port.name}
            style={{ position: 'absolute', right: '-7.5px', top: '50%', transform: 'translateY(-50%)', background: getPortColor(port.type) }}
          />
        </>
      )}
    </div>
  ));
};
