import React from 'react';
import { ActionDefinition } from '../../../plugin-api/actions';
import { EventDefinition } from '../../../core/event-definitions';

interface SidebarProps {
  actions: ActionDefinition[];
  events: EventDefinition[];
}

const onDragStart = (event: React.DragEvent, nodeType: string, nodeName: string) => {
  const data = {
    type: nodeType,
    name: nodeName,
  };
  event.dataTransfer.setData('application/reactflow', JSON.stringify(data));
  event.dataTransfer.effectAllowed = 'move';
};

const Sidebar: React.FC<SidebarProps> = ({ actions, events }) => {
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
          background: 'rgba(46, 125, 50, 0.7)',
          color: '#fff',
          border: '1px solid #1B5E20',
          borderRadius: '5px',
          cursor: 'grab',
          textAlign: 'center',
        }}
      >
        Manual Start
      </div>
      {events.map((eventDef) => (
        <div
          key={eventDef.name}
          onDragStart={(event) => onDragStart(event, 'eventNode', eventDef.name)}
          draggable
          style={{
            padding: '10px 15px',
            margin: '0 10px 10px 10px',
            background: 'rgba(218, 112, 214, 0.3)',
            color: '#ddd',
            border: '1px solid rgba(218, 112, 214, 0.6)',
            borderRadius: '5px',
            cursor: 'grab',
            textAlign: 'center',
          }}
        >
          {eventDef.description || eventDef.name}
        </div>
      ))}

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
