import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionDefinition } from '../../../plugin-api/actions';
import { DataProviderDefinition } from '../../../plugin-api/data-providers';
import { EventDefinition } from '../../../core/event-definitions';
import { Node } from 'reactflow';

interface SidebarProps {
  actions: ActionDefinition[];
  events: EventDefinition[];
  dataProviders: DataProviderDefinition[];
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

const Sidebar: React.FC<SidebarProps> = ({ actions, events, dataProviders, nodes }) => {
  const { t } = useTranslation();
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

  const getItemStyle = (category: string, disabled = false): React.CSSProperties => ({
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
    const color = categoryColors[category] || '#555555'; // 안전한 색상 참조

    return (
      <div
        onDragStart={handleDragStart}
        draggable={!disabled}
        style={effectiveStyle}
        onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = toRgba(color, 0.3); }}
        onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = toRgba(color, 0.15); }}
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
        {t('sequenceEditor.sidebar.startNodes')} {collapsedSections.start ? '▼' : '▲'}
      </h3>
      {!collapsedSections.start && (
        <>
          {React.cloneElement(renderDraggableItem(
            'subroutineInputNode',
            t('sequenceEditor.sidebar.subroutineInput'),
            t('sequenceEditor.sidebar.subroutineInputDesc'),
            'start',
            sequenceType === 'sequence' || hasInputNode || hasClockNode
          ), { key: 'subroutineInputNode' })}
          {React.cloneElement(renderDraggableItem(
            'manualStartNode',
            t('sequenceEditor.sidebar.manualStart'),
            t('sequenceEditor.sidebar.manualStartDesc'),
            'manual',
            sequenceType === 'subroutine'
          ), { key: 'manualStartNode' })}
          {events.map((eventDef) => React.cloneElement(renderDraggableItem(
            'eventNode',
            eventDef.name,
            t(eventDef.description),
            'events',
            sequenceType === 'subroutine'
          ), { key: eventDef.name }))}
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />

      <h3 style={headerStyle} onClick={() => toggleSection('control')}>
        {t('sequenceEditor.sidebar.controlNodes')} {collapsedSections.control ? '▼' : '▲'}
      </h3>
      {!collapsedSections.control && (
        <>
          {React.cloneElement(renderDraggableItem('delayNode', t('sequenceEditor.sidebar.delay'), t('sequenceEditor.sidebar.delayDesc'), 'control', false), { key: 'delayNode' })}
          {React.cloneElement(renderDraggableItem('branchNode', t('sequenceEditor.sidebar.branch'), t('sequenceEditor.sidebar.branchDesc'), 'control', false), { key: 'branchNode' })}
          {React.cloneElement(renderDraggableItem('callSubroutineNode', t('sequenceEditor.sidebar.callSubroutine'), t('sequenceEditor.sidebar.callSubroutineDesc'), 'control', false), { key: 'callSubroutineNode' })}
          {React.cloneElement(renderDraggableItem(
            'clockNode',
            t('sequenceEditor.sidebar.clock'),
            t('sequenceEditor.sidebar.clockDesc'),
            'control',
            hasInputNode // subroutineInputNode가 있으면 Clock 비활성화
          ), { key: 'clockNode' })}
        </>
      )}
      
      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />
      
      <h3 style={headerStyle} onClick={() => toggleSection('data')}>
        {t('sequenceEditor.sidebar.dataNodes')} {collapsedSections.data ? '▼' : '▲'}
      </h3>
      {!collapsedSections.data && (
        <>
          {React.cloneElement(renderDraggableItem('literalNode', t('sequenceEditor.sidebar.literal'), t('sequenceEditor.sidebar.literalDesc'), 'data', false), { key: 'literalNode' })}
          {React.cloneElement(renderDraggableItem('randomNode', t('sequenceEditor.sidebar.randomNumber'), t('sequenceEditor.sidebar.randomNumberDesc'), 'data', false), { key: 'randomNode' })}
          {React.cloneElement(renderDraggableItem('numToStrNode', t('sequenceEditor.sidebar.intToString'), t('sequenceEditor.sidebar.intToStringDesc'), 'data', false), { key: 'numToStrNode' })}
          {React.cloneElement(renderDraggableItem('commentNode', t('sequenceEditor.sidebar.comment'), t('sequenceEditor.sidebar.commentDesc'), 'data', false), { key: 'commentNode' })}
          {dataProviders.map((provider) => React.cloneElement(renderDraggableItem(
            'dataProviderNode',
            provider.name,
            t(provider.description),
            'data',
            false
          ), { key: provider.name }))}
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />

      <h3 style={headerStyle} onClick={() => toggleSection('operators')}>
        {t('sequenceEditor.sidebar.operatorNodes')} {collapsedSections.operators ? '▼' : '▲'}
      </h3>
      {!collapsedSections.operators && (
        <>
          {React.cloneElement(renderDraggableItem('operatorNode', t('sequenceEditor.sidebar.mathOperation'), t('sequenceEditor.sidebar.mathOperationDesc'), 'operators', false, { category: 'math', operator: '+' }), { key: 'op_math' })}
          {React.cloneElement(renderDraggableItem('operatorNode', t('sequenceEditor.sidebar.comparison'), t('sequenceEditor.sidebar.comparisonDesc'), 'operators', false, { category: 'comparison', operator: '==' }), { key: 'op_compare' })}
          {React.cloneElement(renderDraggableItem('operatorNode', t('sequenceEditor.sidebar.logicOperation'), t('sequenceEditor.sidebar.logicOperationDesc'), 'operators', false, { category: 'logic', operator: 'AND' }), { key: 'op_logic' })}
        </>
      )}

      <hr style={{ borderColor: '#444', margin: '15px 5px' }} />
      
      <h3 style={headerStyle} onClick={() => toggleSection('actions')}>
        {t('sequenceEditor.sidebar.actionNodes')} {collapsedSections.actions ? '▼' : '▲'}
      </h3>
      {!collapsedSections.actions && actions.map((action) => React.cloneElement(renderDraggableItem(
        'actionNode',
        action.name,
        t(action.description),
        'actions',
        false
      ), { key: action.name }))}
    </aside>
  );
};

export default Sidebar;