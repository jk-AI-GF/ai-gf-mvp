import React from 'react';
import { ActionDefinition } from '../../../plugin-api/actions';

interface SidebarProps {
  actions: ActionDefinition[];
}

const onDragStart = (event: React.DragEvent, nodeType: string, nodeName: string) => {
  const data = {
    type: nodeType,
    name: nodeName,
  };
  event.dataTransfer.setData('application/reactflow', JSON.stringify(data));
  event.dataTransfer.effectAllowed = 'move';
};

const Sidebar: React.FC<SidebarProps> = ({ actions }) => {
  return (
    <aside style={{
      width: '250px',
      padding: '10px',
      borderRight: '1px solid #444',
      background: '#2a2a2a',
      overflowY: 'auto',
    }}>
      <h3 style={{ color: '#eee', textAlign: 'center', marginBottom: '15px' }}>Event Nodes</h3>
      <div
        onDragStart={(event) => onDragStart(event, 'manualStartNode', 'Manual Start')}
        draggable
        style={{
          padding: '10px 15px',
          margin: '0 10px 10px 10px',
          background: '#2E7D32',
          color: '#fff',
          border: '1px solid #1B5E20',
          borderRadius: '5px',
          cursor: 'grab',
          textAlign: 'center',
        }}
      >
        Manual Start
      </div>

      <hr style={{ borderColor: '#444', margin: '20px 10px' }} />

      <h3 style={{ color: '#eee', textAlign: 'center', marginBottom: '15px' }}>Action Nodes</h3>
      {actions.map((action) => (
        <div
          key={action.name}
          onDragStart={(event) => onDragStart(event, 'actionNode', action.name)}
          draggable
          style={{
            padding: '10px 15px',
            margin: '0 10px 10px 10px',
            background: '#383838',
            color: '#ddd',
            border: '1px solid #555',
            borderRadius: '5px',
            cursor: 'grab',
            textAlign: 'center',
          }}
        >
          {action.description || action.name}
        </div>
      ))}
    </aside>
  );
};

export default Sidebar;
