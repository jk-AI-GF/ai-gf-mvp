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

// --- NEW STYLES ---
const itemNameStyle: React.CSSProperties = {
  fontWeight: 'bold',
  color: '#eee',
  fontSize: '13px', // 이름 폰트 크기 증가
};

const itemDescStyle: React.CSSProperties = {
  color: '#aaa',
  fontSize: '10px',
  marginTop: '2px',
};

// 카테고리별 색상
const categoryColors: Record<string, string> = {
  events: '#DA70D6',
  control: '#FF9800',
  data: '#2196F3',
  operators: '#9C27B0',
  actions: '#4CAF50',
  manual: '#4CAF50',
};

// 옅은 배경색을 만들기 위한 헬퍼 함수
const toRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    textAlign: 'left',
    paddingLeft: '5px',
    marginBottom: '10px',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: '14px',
  };

  // 각 항목에 대한 기본 스타일을 생성하는 함수
  const getItemStyle = (category: string): React.CSSProperties => ({
    padding: '6px 10px',
    margin: '0 5px 6px 5px',
    cursor: 'grab',
    backgroundColor: toRgba(categoryColors[category] || '#555555', 0.15), // 옅은 배경색 항상 표시
    borderLeft: `3px solid ${toRgba(categoryColors[category] || '#555555', 0.6)}`,
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  });

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
            style={getItemStyle('manual')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.manual, 0.3)}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.manual, 0.15)}
          >
            <div style={itemNameStyle}>Manual Start</div>
            <div style={itemDescStyle}>수동으로 시퀀스를 시작합니다.</div>
          </div>
          {events.map((eventDef) => (
            <div
              key={eventDef.name}
              onDragStart={(event) => onDragStart(event, 'eventNode', eventDef.name)}
              draggable
              style={getItemStyle('events')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.events, 0.3)}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.events, 0.15)}
            >
              <div style={itemNameStyle}>{eventDef.name}</div>
              <div style={itemDescStyle}>{eventDef.description}</div>
            </div>
          ))}
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />

      <h3 style={headerStyle} onClick={() => toggleSection('control')}>
        Control Nodes {collapsedSections.control ? '▼' : '▲'}
      </h3>
      {!collapsedSections.control && (
        <>
          <div
            onDragStart={(event) => onDragStart(event, 'delayNode', 'Delay')}
            draggable
            style={getItemStyle('control')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.control, 0.3)}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.control, 0.15)}
          >
            <div style={itemNameStyle}>Delay</div>
            <div style={itemDescStyle}>실행을 잠시 멈춥니다.</div>
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'branchNode', 'Branch')}
            draggable
            style={getItemStyle('control')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.control, 0.3)}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.control, 0.15)}
          >
            <div style={itemNameStyle}>Branch (If)</div>
            <div style={itemDescStyle}>조건에 따라 실행 흐름을 분기합니다.</div>
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'clockNode', 'Clock')}
            draggable
            style={getItemStyle('control')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.control, 0.3)}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.control, 0.15)}
          >
            <div style={itemNameStyle}>Clock</div>
            <div style={itemDescStyle}>일정 간격으로 실행 신호를 보냅니다.</div>
          </div>
        </>
      )}
      
      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />
      
      <h3 style={headerStyle} onClick={() => toggleSection('data')}>
        Data Nodes {collapsedSections.data ? '▼' : '▲'}
      </h3>
      {!collapsedSections.data && (
        <>
          <div
            onDragStart={(event) => onDragStart(event, 'literalNode', 'Literal')}
            draggable
            style={getItemStyle('data')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.data, 0.3)}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.data, 0.15)}
          >
            <div style={itemNameStyle}>Literal</div>
            <div style={itemDescStyle}>문자열, 숫자 등 고정 값을 만듭니다.</div>
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'randomNode', 'Random Number')}
            draggable
            style={getItemStyle('data')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.data, 0.3)}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.data, 0.15)}
          >
            <div style={itemNameStyle}>Random Number</div>
            <div style={itemDescStyle}>무작위 숫자를 생성합니다.</div>
          </div>
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />

      <h3 style={headerStyle} onClick={() => toggleSection('operators')}>
        Operator Nodes {collapsedSections.operators ? '▼' : '▲'}
      </h3>
      {!collapsedSections.operators && (
        <>
          <div
            onDragStart={(event) => onDragStart(event, 'operatorNode', 'Math Operation', { category: 'math', operator: '+' })}
            draggable
            style={getItemStyle('operators')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.operators, 0.3)}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.operators, 0.15)}
          >
            <div style={itemNameStyle}>Math Operation</div>
            <div style={itemDescStyle}>산술 연산을 수행합니다.</div>
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'operatorNode', 'Comparison', { category: 'comparison', operator: '==' })}
            draggable
            style={getItemStyle('operators')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.operators, 0.3)}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.operators, 0.15)}
          >
            <div style={itemNameStyle}>Comparison</div>
            <div style={itemDescStyle}>두 값을 비교합니다.</div>
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'operatorNode', 'Logic Operation', { category: 'logic', operator: 'AND' })}
            draggable
            style={getItemStyle('operators')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.operators, 0.3)}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.operators, 0.15)}
          >
            <div style={itemNameStyle}>Logic Operation</div>
            <div style={itemDescStyle}>논리 연산을 수행합니다.</div>
          </div>
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />
      
      <h3 style={headerStyle} onClick={() => toggleSection('actions')}>
        Action Nodes {collapsedSections.actions ? '▼' : '▲'}
      </h3>
      {!collapsedSections.actions && actions.map((action) => (
        <div
          key={action.name}
          onDragStart={(event) => onDragStart(event, 'actionNode', action.name)}
          draggable
          style={getItemStyle('actions')}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.actions, 0.3)}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = toRgba(categoryColors.actions, 0.15)}
        >
          <div style={itemNameStyle}>{action.name}</div>
          <div style={itemDescStyle}>{action.description}</div>
        </div>
      ))}
    </aside>
  );
};

export default Sidebar;

