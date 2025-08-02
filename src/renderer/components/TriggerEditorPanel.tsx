import React, { useState, useEffect, useMemo } from 'react';
import Panel from './Panel';
import styles from './TriggerEditorPanel.module.css';
import { useAppContext } from '../contexts/AppContext';
import { ActionDefinition, ActionParam } from '../../plugin-api/actions';
import { EVENT_DEFINITIONS } from '../../core/event-definitions';
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
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});

  const availableEvents = EVENT_DEFINITIONS;

  const availableContextKeys = useMemo(() => {
    if (triggerType !== 'event') return [];
    const selectedEventDef = availableEvents.find(e => e.name === eventName);
    // Refactored to use payloadSchema instead of keys
    return selectedEventDef ? selectedEventDef.payloadSchema.map(p => `event.${p.key}`) : [];
  }, [triggerType, eventName, availableEvents]);

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
    
    // Reset params and errors when action changes
    const defaultParams: Record<string, any> = {};
    newAction?.params.forEach(p => {
      defaultParams[p.name] = p.defaultValue;
    });
    setActionParams(defaultParams);
    setParamErrors({}); // Clear previous errors
  };

  const handleParamChange = (paramName: string, value: any) => {
    // Update param value
    setActionParams(prev => ({ ...prev, [paramName]: value }));

    // Validate param value
    const paramDef = selectedAction?.params.find(p => p.name === paramName);
    if (paramDef?.validation) {
      const validationResult = paramDef.validation(value);
      setParamErrors(prev => ({
        ...prev,
        [paramName]: typeof validationResult === 'string' ? validationResult : '',
      }));
    }
  };

  const handleSave = () => {
    if (!selectedAction || Object.values(paramErrors).some(e => e)) return;

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
      const error = paramErrors[param.name];

      const renderInput = () => {
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
      };

      return (
        <div key={param.name} className={styles.paramControl}>
          {renderInput()}
          {error && <span className={styles.paramError}>{error}</span>}
        </div>
      );
    });
  };

  const panelTitle = triggerToEdit ? "트리거 편집" : "새 트리거 생성";
  const isSaveDisabled = !name || !selectedAction || Object.values(paramErrors).some(e => e);

  return (
    <Panel title={panelTitle} onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.form}>
        <input type="text" placeholder="트리거 이름" value={name} onChange={e => setName(e.target.value)} />
        
        <h4>실행 시점 (WHEN)</h4>
        <select value={triggerType} onChange={e => setTriggerType(e.target.value as any)}>
          <option value="event">특정 이벤트 발생 시</option>
          <option value="polling">상태 변경 시 (주기적 확인)</option>
        </select>
        {triggerType === 'event' && (
          <select value={eventName} onChange={e => setEventName(e.target.value)}>
            {availableEvents.map(event => <option key={event.name} value={event.name}>{event.name} ({event.description})</option>)}
          </select>
        )}

        <h4>조건 (IF)</h4>
        {availableContextKeys.length > 0 && (
          <div className={styles.contextHint}>
            사용 가능 키: {availableContextKeys.join(', ')}
          </div>
        )}
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
          <button onClick={handleSave} disabled={isSaveDisabled}>저장</button>
          <button onClick={onClose}>취소</button>
        </div>
      </div>
    </Panel>
  );
};

export default TriggerEditorPanel;
