import React, { useState, useEffect, useMemo } from 'react';
import Panel from './Panel';
import styles from './TriggerEditorPanel.module.css';
import { useAppContext } from '../contexts/AppContext';
import { ActionDefinition, ActionParam } from '../../plugin-api/actions';
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
  const [triggerType, setTriggerType] = useState<'polling' | 'event'>('event');
  const [eventName, setEventName] = useState('chat:newMessage');
  const [conditionKey, setConditionKey] = useState('');
  const [conditionOp, setConditionOp] = useState<'==' | '!=' | '>' | '<' | 'exists' | 'not exists'>('==');
  const [conditionValue, setConditionValue] = useState<string | number | boolean>('');
  
  const [availableActions, setAvailableActions] = useState<ActionDefinition[]>([]);
  const [selectedAction, setSelectedAction] = useState<ActionDefinition | null>(null);
  const [actionParams, setActionParams] = useState<Record<string, any>>({});

  const availableEvents = KNOWN_EVENTS;

  useEffect(() => {
    const fetchActions = async () => {
      if (pluginManager) {
        const actions = await pluginManager.context.actions.getAvailableActions();
        setAvailableActions(actions);
        if (!triggerToEdit) {
          setSelectedAction(actions[0] || null);
        }
      }
    };
    fetchActions();
  }, [pluginManager, triggerToEdit]);

  useEffect(() => {
    if (triggerToEdit) {
      setName(triggerToEdit.name);
      setTriggerType(triggerToEdit.triggerType);
      setEventName(triggerToEdit.eventName || 'chat:newMessage');
      setConditionKey(triggerToEdit.condition.key);
      setConditionOp(triggerToEdit.condition.operator);
      setConditionValue(triggerToEdit.condition.value);
      
      const actionDef = availableActions.find(a => a.name === triggerToEdit.action.type);
      setSelectedAction(actionDef || null);
      
      // Convert params array back to object for editing
      const paramsObject: Record<string, any> = {};
      actionDef?.params.forEach((param, index) => {
        paramsObject[param.name] = triggerToEdit.action.params[index];
      });
      setActionParams(paramsObject);

    } else {
      resetForm();
    }
  }, [triggerToEdit, availableActions]);

  const handleActionChange = (actionName: string) => {
    const newAction = availableActions.find(a => a.name === actionName) || null;
    setSelectedAction(newAction);
    // Reset params when action changes
    const defaultParams: Record<string, any> = {};
    newAction?.params.forEach(p => {
      defaultParams[p.name] = p.defaultValue;
    });
    setActionParams(defaultParams);
  };

  const handleParamChange = (paramName: string, value: any) => {
    setActionParams(prev => ({ ...prev, [paramName]: value }));
  };

  const handleSave = () => {
    if (!selectedAction) return;

    // Convert params object to array in the correct order before saving
    const paramsArray = selectedAction.params.map(p => actionParams[p.name]);

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
        type: selectedAction.name,
        params: paramsArray,
      },
    };
    onSave(newTrigger);
    onClose();
  };
  
  const resetForm = () => {
    setName('');
    setTriggerType('event');
    setEventName('chat:newMessage');
    setConditionKey('');
    setConditionOp('==');
    setConditionValue('');
    if (availableActions.length > 0) {
      setSelectedAction(availableActions[0]);
      const defaultParams: Record<string, any> = {};
      availableActions[0].params.forEach(p => {
        defaultParams[p.name] = p.defaultValue;
      });
      setActionParams(defaultParams);
    }
  }

  const renderActionParams = () => {
    if (!selectedAction) return <p>Select an action.</p>;
    if (selectedAction.params.length === 0) return <p>This action takes no parameters.</p>;

    return selectedAction.params.map((param: ActionParam) => {
      const value = actionParams[param.name] ?? param.defaultValue;
      switch (param.type) {
        case 'string':
          return <input key={param.name} type="text" placeholder={param.description} value={value || ''} onChange={e => handleParamChange(param.name, e.target.value)} />;
        case 'number':
          return <input key={param.name} type="number" placeholder={param.description} value={value || 0} onChange={e => handleParamChange(param.name, parseFloat(e.target.value))} />;
        case 'boolean':
          return <label key={param.name}><input type="checkbox" checked={!!value} onChange={e => handleParamChange(param.name, e.target.checked)} /> {param.description}</label>;
        case 'enum':
          return (
            <select key={param.name} value={value} onChange={e => handleParamChange(param.name, e.target.value)}>
              {param.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          );
        default:
          return null;
      }
    });
  };

  const panelTitle = triggerToEdit ? "트리거 편집" : "새 트리거 생성";

  return (
    <Panel title={panelTitle} onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.form}>
        <input type="text" placeholder="트리거 이름" value={name} onChange={e => setName(e.target.value)} />
        
        <h4>실행 시점 (WHEN)</h4>
        <select value={triggerType} onChange={e => setTriggerType(e.target.value as any)}>
          <option value="event">특정 이벤트 발생 시</option>
          <option value="polling" disabled>상태 변경 시 (미구현)</option>
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
        <select value={selectedAction?.name || ''} onChange={e => handleActionChange(e.target.value)}>
          {availableActions.map(action => <option key={action.name} value={action.name}>{action.name} ({action.description})</option>)}
        </select>
        <div className={styles.actionParams}>
          {renderActionParams()}
        </div>

        <div className={styles.formButtons}>
          <button onClick={handleSave} disabled={!name || !selectedAction}>저장</button>
          <button onClick={onClose}>취소</button>
        </div>
      </div>
    </Panel>
  );
};

export default TriggerEditorPanel;
