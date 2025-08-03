import React, { useState } from 'react';
import { ActionDefinition } from '../../../plugin-api/actions';
import { EventDefinition } from '../../../core/event-definitions';

interface SidebarProps {
  actions: ActionDefinition[];
  events: EventDefinition[];
}

const onDragStart = (event: React.DragEvent, nodeType: string, name: string, additionalData: Record<string, any> = {}) => {
  const data = {
    type: nodeType,
    name,
    ...additionalData,
  };
  event.dataTransfer.setData('application/reactflow', JSON.stringify(data));
  event.dataTransfer.effectAllowed = 'move';
};

const Sidebar: React.FC<SidebarProps> = ({ actions, events }) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    events: false,
    control: false,
    data: false,
    actions: false,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const headerStyle: React.CSSProperties = {
    color: '#eee',
    textAlign: 'center',
    marginBottom: '15px',
    cursor: 'pointer',
    userSelect: 'none',
  };

  return (
    <aside style={{
      width: '250px',
      padding: '10px',
      borderRight: '1px solid #444',
      background: '#2a2a2a',
      overflowY: 'auto',
    }}>
      <h3 style={headerStyle} onClick={() => toggleSection('events')}>
        Event Nodes {collapsedSections.events ? '▼' : '▲'}
      </h3>
      {!collapsedSections.events && (
        <>
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
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '20px 10px' }} />

      <h3 style={headerStyle} onClick={() => toggleSection('control')}>
        Control Nodes {collapsedSections.control ? '▼' : '▲'}
      </h3>
      {!collapsedSections.control && (
        <>
          <div
            onDragStart={(event) => onDragStart(event, 'delayNode', 'Delay')}
            draggable
            style={{
              padding: '10px 15px',
              margin: '0 10px 10px 10px',
              background: 'rgba(255, 152, 0, 0.3)',
              color: '#ddd',
              border: '1px solid rgba(255, 152, 0, 0.6)',
              borderRadius: '5px',
              cursor: 'grab',
              textAlign: 'center',
            }}
          >
            Delay
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'branchNode', 'Branch')}
            draggable
            style={{
              padding: '10px 15px',
              margin: '0 10px 10px 10px',
              background: 'rgba(255, 82, 82, 0.3)',
              color: '#ddd',
              border: '1px solid rgba(255, 82, 82, 0.6)',
              borderRadius: '5px',
              cursor: 'grab',
              textAlign: 'center',
            }}
          >
            Branch (If)
          </div>
        </>
      )}
      
      <hr style={{ borderColor: '#444', margin: '20px 10px' }} />
      
      <h3 style={headerStyle} onClick={() => toggleSection('data')}>
        Data Nodes {collapsedSections.data ? '▼' : '▲'}
      </h3>
      {!collapsedSections.data && (
        <div
          onDragStart={(event) => onDragStart(event, 'literalNode', 'Literal')}
          draggable
          style={{
            padding: '10px 15px',
            margin: '0 10px 10px 10px',
            background: 'rgba(33, 150, 243, 0.3)',
            color: '#ddd',
            border: '1px solid rgba(33, 150, 243, 0.6)',
            borderRadius: '5px',
            cursor: 'grab',
            textAlign: 'center',
          }}
        >
          Literal
        </div>
      )}

      <hr style={{ borderColor: '#444', margin: '20px 10px' }} />

      <h3 style={headerStyle} onClick={() => toggleSection('operators')}>
        Operator Nodes {collapsedSections.operators ? '▼' : '▲'}
      </h3>
      {!collapsedSections.operators && (
        <>
          <div
            onDragStart={(event) => onDragStart(event, 'operatorNode', 'Math Operation', { category: 'math', operator: '+' })}
            draggable
            style={{
              padding: '10px 15px',
              margin: '0 10px 10px 10px',
              background: 'rgba(156, 39, 176, 0.3)',
              color: '#ddd',
              border: '1px solid rgba(156, 39, 176, 0.6)',
              borderRadius: '5px',
              cursor: 'grab',
              textAlign: 'center',
            }}
          >
            Math Operation
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'operatorNode', 'Comparison', { category: 'comparison', operator: '==' })}
            draggable
            style={{
              padding: '10px 15px',
              margin: '0 10px 10px 10px',
              background: 'rgba(76, 175, 80, 0.3)',
              color: '#ddd',
              border: '1px solid rgba(76, 175, 80, 0.6)',
              borderRadius: '5px',
              cursor: 'grab',
              textAlign: 'center',
            }}
          >
            Comparison
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'operatorNode', 'Logic Operation', { category: 'logic', operator: 'AND' })}
            draggable
            style={{
              padding: '10px 15px',
              margin: '0 10px 10px 10px',
              background: 'rgba(255, 193, 7, 0.3)',
              color: '#ddd',
              border: '1px solid rgba(255, 193, 7, 0.6)',
              borderRadius: '5px',
              cursor: 'grab',
              textAlign: 'center',
            }}
          >
            Logic Operation
          </div>
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '20px 10px' }} />
      
      <h3 style={headerStyle} onClick={() => toggleSection('actions')}>
        Action Nodes {collapsedSections.actions ? '▼' : '▲'}
      </h3>
      {!collapsedSections.actions && actions.map((action) => (
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

