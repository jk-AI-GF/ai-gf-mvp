import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ActionDefinition, ActionParam } from '../../../plugin-api/actions';

// --- Type & Style Definitions ---

export const HandleType = {
  EXECUTION: 'execution',
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
};

const handleTypeColors: Record<string, string> = {
  [HandleType.EXECUTION]: '#ffffff',
  [HandleType.STRING]: '#ffc107', // Amber
  [HandleType.NUMBER]: '#4caf50', // Green
  [HandleType.BOOLEAN]: '#f44336', // Red
};

const getHandleStyle = (type: string) => ({
  background: handleTypeColors[type] || '#777',
});

const nodeStyle: React.CSSProperties = {
  position: 'relative', // This is crucial for handle positioning
  background: '#282c34',
  color: '#ffffff',
  border: '1px solid #555',
  borderRadius: '8px',
  padding: '15px',
  minWidth: '200px',
  fontSize: '14px',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '10px',
  fontWeight: 'bold',
  fontSize: '16px',
  textAlign: 'center',
};

const paramStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
  position: 'relative',
};

// --- Component ---

interface ActionNodeData {
  definition: ActionDefinition;
}

const ActionNode: React.FC<NodeProps<ActionNodeData>> = ({ data }) => {
  const { definition } = data;

  return (
    <div style={nodeStyle}>
      <div style={headerStyle}>{definition.description || definition.name}</div>

      {/* Execution Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="exec-in"
        style={getHandleStyle(HandleType.EXECUTION)}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="exec-out"
        style={getHandleStyle(HandleType.EXECUTION)}
      />

      {/* Parameter Handles */}
      {definition.params.map((param: ActionParam, index: number) => (
        <div key={param.name} style={paramStyle}>
          <span>{param.name}</span>
          <Handle
            type="target"
            position={Position.Left}
            id={param.name}
            style={{ ...getHandleStyle(param.type) }}
          />
        </div>
      ))}
    </div>
  );
};

export default ActionNode;
