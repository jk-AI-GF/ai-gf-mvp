import React, { useState, useEffect } from 'react';
import Panel from './Panel';
import styles from './TriggerEditorPanel.module.css';
import { useAppContext } from '../contexts/AppContext';
import { Actions } from '../../plugin-api/actions';
import { KNOWN_EVENTS } from '../../core/known-events';
import { CustomTrigger } from '../../core/custom-trigger-manager';

interface TriggerEditorPanelProps {
  onClose: () => void;
  onSave: (trigger: CustomTrigger) => void;
  triggerToEdit: CustomTrigger | null;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const TriggerEditorPanel: React.FC<TriggerEditorPanelProps> = ({ 
  onClose, 
  onSave, 
  triggerToEdit, 
  initialPos, 
  onDragEnd 
}) => {
  const { pluginManager } = useAppContext();
  
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<'polling' | 'event'>('polling');
  const [eventName, setEventName] = useState('chat:newMessage');
  const [conditionKey, setConditionKey] = useState('');
  const [conditionOp, setConditionOp] = useState<'==' | '!=' | '>' | '<' | 'exists' | 'not exists'>('==');
  const [conditionValue, setConditionValue] = useState<string | number | boolean>('');
  const [actionType, setActionType] = useState<keyof Actions>('speak');
  const [actionParams, setActionParams] = useState<any[]>([]);

  const availableActions = pluginManager ? Object.keys(pluginManager.context.actions) as (keyof Actions)[] : [];
  const availableEvents = KNOWN_EVENTS;

  useEffect(() => {
    if (triggerToEdit) {
      setName(triggerToEdit.name);
      setTriggerType(triggerToEdit.triggerType);
      setEventName(triggerToEdit.eventName || 'chat:newMessage');
      setConditionKey(triggerToEdit.condition.key);
      setConditionOp(triggerToEdit.condition.operator);
      setConditionValue(triggerToEdit.condition.value);
      setActionType(triggerToEdit.action.type);
      setActionParams(triggerToEdit.action.params);
    } else {
      resetForm();
    }
  }, [triggerToEdit]);

  const handleSave = () => {
    const newTrigger: CustomTrigger = {
      id: triggerToEdit ? triggerToEdit.id : Date.now().toString(),
      name,
      enabled: triggerToEdit ? triggerToEdit.enabled : true,
      triggerType,
      eventName: triggerType === 'event' ? eventName : undefined,
      condition: {
        key: conditionKey,
        operator: conditionOp,
        value: conditionValue,
      },
      action: {
        type: actionType,
        params: actionParams,
      },
    };
    onSave(newTrigger);
    onClose(); // Close panel after saving
  };
  
  const resetForm = () => {
    setName('');
    setTriggerType('polling');
    setEventName('chat:newMessage');
    setConditionKey('');
    setConditionOp('==');
    setConditionValue('');
    setActionType('speak');
    setActionParams([]);
  }

  const renderActionParams = () => {
    switch (actionType) {
      case 'speak':
        return <input type="text" placeholder="Message" value={actionParams[0] || ''} onChange={e => setActionParams([e.target.value])} />;
      case 'playAnimation':
        return (
          <>
            <input type="text" placeholder="Animation Name" value={actionParams[0] || ''} onChange={e => setActionParams([e.target.value, actionParams[1]])} />
            <label><input type="checkbox" checked={actionParams[1] || false} onChange={e => setActionParams([actionParams[0], e.target.checked])} /> Loop</label>
          </>
        );
      case 'setExpression':
         return (
          <>
            <input type="text" placeholder="Expression Name" value={actionParams[0] || ''} onChange={e => setActionParams([e.target.value, actionParams[1]])} />
            <input type="number" step="0.1" min="0" max="1" placeholder="Weight" value={actionParams[1] || 1.0} onChange={e => setActionParams([actionParams[0], parseFloat(e.target.value)])} />
          </>
        );
      default:
        return <p>This action requires no parameters or is not yet configured in the UI.</p>;
    }
  };

  const panelTitle = triggerToEdit ? "트리거 편집" : "새 트리거 생성";

  return (
    <Panel title={panelTitle} onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.form}>
        <input type="text" placeholder="트리거 이름" value={name} onChange={e => setName(e.target.value)} />
        
        <h4>실행 시점 (WHEN)</h4>
        <select value={triggerType} onChange={e => setTriggerType(e.target.value as any)}>
          <option value="polling">상태 변경 시 (주기적 확인)</option>
          <option value="event">특정 이벤트 발생 시</option>
        </select>
        {triggerType === 'event' && (
          <select value={eventName} onChange={e => setEventName(e.target.value)}>
            {availableEvents.map(event => <option key={event.name} value={event.name}>{event.name} ({event.description})</option>)}
          </select>
        )}

        <h4>조건 (IF)</h4>
        <input type="text" placeholder="키 (예: event.text)" value={conditionKey} onChange={e => setConditionKey(e.target.value)} />
        <select value={conditionOp} onChange={e => setConditionOp(e.target.value as any)}>
          <option value="==">==</option>
          <option value="!=">!=</option>
          <option value=">">&gt;</option>
          <option value="<">&lt;</option>
          <option value="exists">exists</option>
          <option value="not exists">not exists</option>
        </select>
        <input type="text" placeholder="비교 값" value={String(conditionValue)} onChange={e => setConditionValue(e.target.value)} />

        <h4>액션 (THEN)</h4>
        <select value={actionType} onChange={e => { setActionType(e.target.value as any); setActionParams([]); }}>
          {availableActions.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <div className={styles.actionParams}>
          {renderActionParams()}
        </div>

        <div className={styles.formButtons}>
          <button onClick={handleSave}>저장</button>
          <button onClick={onClose}>취소</button>
        </div>
      </div>
    </Panel>
  );
};

export default TriggerEditorPanel;
