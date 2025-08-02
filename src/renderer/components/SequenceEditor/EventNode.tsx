import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { EventNodeModel } from '../../../core/sequence/EventNodeModel';
import { renderHandles } from './node-style-utils';
import { Position } from 'reactflow';

const EventNode: React.FC<NodeProps<EventNodeModel>> = ({ data }) => {
  if (!(data instanceof EventNodeModel)) {
    return <div>Error: Invalid data for EventNode</div>;
  }

  const { name, inputs, outputs } = data;

  return (
    <div style={{
      background: 'rgba(142, 68, 173, 0.5)', // Purple background
      color: '#fff',
      borderRadius: '5px',
      border: '1px solid #8e44ad',
      width: 250,
      fontSize: '12px',
    }}>
      <div style={{ background: '#8e44ad', padding: '8px', fontWeight: 'bold', textAlign: 'center', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
        {name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 8px' }}>
        {/* Event nodes typically don't have inputs, but we keep this for consistency */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start', width: '50%' }}>
          {renderHandles(inputs, Position.Left)}
        </div>
        {/* They only have output ports */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', width: '50%' }}>
          {renderHandles(outputs, Position.Right)}
        </div>
      </div>
    </div>
  );
};

export default memo(EventNode);