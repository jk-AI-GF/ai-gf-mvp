import React, { useMemo, useState } from 'react';
import { ActionDefinition } from '../../../plugin-api/actions';
import { EventDefinition } from '../../../core/event-definitions';
import { Node } from 'reactflow';

interface SidebarProps {
  actions: ActionDefinition[];
  events: EventDefinition[];
  nodes: Node[];
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

// --- STYLES ---
const itemNameStyle: React.CSSProperties = {
  fontWeight: 'bold',
  color: '#eee',
  fontSize: '13px',
};

const itemDescStyle: React.CSSProperties = {
  color: '#aaa',
  fontSize: '10px',
  marginTop: '2px',
};

const categoryColors: Record<string, string> = {
  start: '#10A37F',
  events: '#DA70D6',
  manual: '#FFC107',
  control: '#FF9800',
  data: '#2196F3',
  operators: '#9C27B0',
  actions: '#4CAF50',
};

const toRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const Sidebar: React.FC<SidebarProps> = ({ actions, events, nodes }) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    start: false,
    control: false,
    data: false,
    operators: false,
    actions: false,
  });

  const { sequenceType, hasInputNode, hasClockNode } = useMemo(() => {
    const hasEvent = nodes.some(n => n.type === 'eventNode' || n.type === 'manualStartNode');
    const hasInput = nodes.some(n => n.type === 'subroutineInputNode');
    const hasClock = nodes.some(n => n.type === 'clockNode');

    let type: 'sequence' | 'subroutine' | null = null;
    if (hasEvent) {
      type = 'sequence';
    } else if (hasInput) {
      type = 'subroutine';
    }

    return {
      sequenceType: type,
      hasInputNode: hasInput,
      hasClockNode: hasClock,
    };
  }, [nodes]);

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

  const getItemStyle = (category: string, disabled: boolean = false): React.CSSProperties => ({
    padding: '6px 10px',
    margin: '0 5px 6px 5px',
    cursor: disabled ? 'not-allowed' : 'grab',
    backgroundColor: toRgba(categoryColors[category] || '#555555', 0.15),
    borderLeft: `3px solid ${toRgba(categoryColors[category] || '#555555', 0.6)}`,
    borderRadius: '4px',
    transition: 'background-color 0.2s, opacity 0.2s',
    opacity: disabled ? 0.5 : 1,
  });

  const renderDraggableItem = (
    nodeType: string,
    name: string,
    description: string,
    category: string,
    disabled: boolean,
    additionalData: Record<string, any> = {}
  ) => {
    const handleDragStart = (event: React.DragEvent) => {
      if (!disabled) {
        onDragStart(event, nodeType, name, additionalData);
      }
    };

    const effectiveStyle = getItemStyle(category, disabled);

    return (
      <div
        onDragStart={handleDragStart}
        draggable={!disabled}
        style={effectiveStyle}
        onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = toRgba(categoryColors[category], 0.3); }}
        onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = toRgba(categoryColors[category], 0.15); }}
      >
        <div style={itemNameStyle}>{name}</div>
        <div style={itemDescStyle}>{description}</div>
      </div>
    );
  };

  return (
    <aside style={{
      width: '250px',
      padding: '10px',
      borderRight: '1px solid #444',
      background: '#2a2a2a',
      overflowY: 'auto',
    }}>
      <h3 style={headerStyle} onClick={() => toggleSection('start')}>
        Start Nodes {collapsedSections.start ? '▼' : '▲'}
      </h3>
      {!collapsedSections.start && (
        <>
          {renderDraggableItem(
            'subroutineInputNode',
            'Subroutine Input',
            '서브루틴의 입력을 정의합니다.',
            'start',
            sequenceType === 'sequence' || hasInputNode || hasClockNode
          )}
          {renderDraggableItem(
            'manualStartNode',
            'Manual Start',
            '수동으로 시퀀스를 시작합니다.',
            'manual',
            sequenceType === 'subroutine'
          )}
          {events.map((eventDef) => renderDraggableItem(
            'eventNode',
            eventDef.name,
            eventDef.description,
            'events',
            sequenceType === 'subroutine',
            { key: eventDef.name }
          ))}
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />

      <h3 style={headerStyle} onClick={() => toggleSection('control')}>
        Control Nodes {collapsedSections.control ? '▼' : '▲'}
      </h3>
      {!collapsedSections.control && (
        <>
          {renderDraggableItem('delayNode', 'Delay', '실행을 잠시 멈춥니다.', 'control', false)}
          {renderDraggableItem('branchNode', 'Branch (If)', '조건에 따라 실행 흐름을 분기합니다.', 'control', false)}
          {renderDraggableItem(
            'clockNode',
            'Clock',
            '일정 간격으로 실행 신호를 보냅니다.',
            'control',
            hasInputNode // subroutineInputNode가 있으면 Clock 비활성화
          )}
        </>
      )}
      
      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />
      
      <h3 style={headerStyle} onClick={() => toggleSection('data')}>
        Data Nodes {collapsedSections.data ? '▼' : '▲'}
      </h3>
      {!collapsedSections.data && (
        <>
          {renderDraggableItem('literalNode', 'Literal', '문자열, 숫자 등 고정 값을 만듭니다.', 'data', false)}
          {renderDraggableItem('randomNode', 'Random Number', '무작위 숫자를 생성합니다.', 'data', false)}
          {renderDraggableItem('numToStrNode', 'Int to String', '정수를 문자열로 변환합니다.', 'data', false)}
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />

      <h3 style={headerStyle} onClick={() => toggleSection('operators')}>
        Operator Nodes {collapsedSections.operators ? '▼' : '▲'}
      </h3>
      {!collapsedSections.operators && (
        <>
          {renderDraggableItem('operatorNode', 'Math Operation', '산술 연산을 수행합니다.', 'operators', false, { category: 'math', operator: '+' })}
          {renderDraggableItem('operatorNode', 'Comparison', '두 값을 비교합니다.', 'operators', false, { category: 'comparison', operator: '==' })}
          {renderDraggableItem('operatorNode', 'Logic Operation', '논리 연산을 수행합니다.', 'operators', false, { category: 'logic', operator: 'AND' })}
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />
      
      <h3 style={headerStyle} onClick={() => toggleSection('actions')}>
        Action Nodes {collapsedSections.actions ? '▼' : '▲'}
      </h3>
      {!collapsedSections.actions && actions.map((action) => renderDraggableItem(
        'actionNode',
        action.name,
        action.description,
        'actions',
        false,
        { key: action.name }
      ))}
    </aside>
  );
};

export default Sidebar;

