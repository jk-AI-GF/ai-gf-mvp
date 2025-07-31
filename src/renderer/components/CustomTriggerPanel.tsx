import React, { useState, useEffect } from 'react';
import Panel from './Panel';
import styles from './CustomTriggerPanel.module.css';
import { useAppContext } from '../contexts/AppContext';
import { Actions } from '../../plugin-api/actions';

// 저장될 트리거의 구조 정의
interface CustomTrigger {
  id: string;
  name: string;
  triggerType: 'polling' | 'event';
  eventName?: string; // event 타입일 때 사용
  condition: {
    key: string;
    operator: '==' | '!=' | '>' | '<' | 'exists' | 'not exists';
    value: string | number | boolean;
  };
  action: {
    type: keyof Actions;
    params: any[];
  };
}

interface CustomTriggerPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const CustomTriggerPanel: React.FC<CustomTriggerPanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const { pluginManager } = useAppContext();
  const [triggers, setTriggers] = useState<CustomTrigger[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // 새 트리거 폼 상태
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<'polling' | 'event'>('polling');
  const [eventName, setEventName] = useState('chat:newMessage');
  const [conditionKey, setConditionKey] = useState('');
  const [conditionOp, setConditionOp] = useState<'==' | '!=' | '>' | '<' | 'exists' | 'not exists'>('==');
  const [conditionValue, setConditionValue] = useState('');
  const [actionType, setActionType] = useState<keyof Actions>('speak');
  const [actionParams, setActionParams] = useState<any[]>([]);

  const availableActions = pluginManager ? Object.keys(pluginManager.context.actions) as (keyof Actions)[] : [];
  const availableEvents = ['chat:newMessage', 'vrm:loaded', 'ui:editModeToggled']; // 예시 이벤트 목록

  useEffect(() => {
    const loadTriggers = async () => {
      const savedTriggers = await window.electronAPI.getCustomTriggers();
      if (savedTriggers) {
        setTriggers(savedTriggers);
        // Initial loading is now handled by CustomTriggerManager,
        // so we don't need to do anything here.
      }
    };
    loadTriggers();
  }, []);

  const handleSave = () => {
    const newTrigger: CustomTrigger = {
      id: Date.now().toString(),
      name,
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
    const updatedTriggers = [...triggers, newTrigger];
    setTriggers(updatedTriggers);
    window.electronAPI.setCustomTriggers(updatedTriggers);
    
    // Dynamically register the new trigger
    pluginManager?.context.system.registerCustomTrigger(newTrigger);
    
    resetForm();
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    const updatedTriggers = triggers.filter(t => t.id !== id);
    setTriggers(updatedTriggers);
    window.electronAPI.setCustomTriggers(updatedTriggers);

    // Dynamically unregister the trigger
    pluginManager?.context.system.unregisterCustomTrigger(id);
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
    // 선택된 액션에 따라 다른 파라미터 입력 필드를 렌더링
    // 이 부분은 각 액션의 파라미터 구조를 알아야 함
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
      // TODO: 다른 액션들에 대한 UI 추가
      default:
        return <p>This action requires no parameters or is not yet configured in the UI.</p>;
    }
  };

  return (
    <Panel title="커스텀 트리거" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.content}>
        {triggers.map(trigger => (
          <div key={trigger.id} className={styles.triggerItem}>
            <span>{trigger.name}</span>
            <button onClick={() => handleDelete(trigger.id)}>삭제</button>
          </div>
        ))}
        
        <button onClick={() => setIsCreating(true)} className={styles.addButton}>새 트리거 추가</button>

        {isCreating && (
          <div className={styles.form}>
            <h3>새 트리거 생성</h3>
            <input type="text" placeholder="트리거 이름" value={name} onChange={e => setName(e.target.value)} />
            
            <h4>실행 시점 (WHEN)</h4>
            <select value={triggerType} onChange={e => setTriggerType(e.target.value as any)}>
              <option value="polling">상태 변경 시 (주기적 확인)</option>
              <option value="event">특정 이벤트 발생 시</option>
            </select>
            {triggerType === 'event' && (
              <select value={eventName} onChange={e => setEventName(e.target.value)}>
                {availableEvents.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            )}

            <h4>조건 (IF)</h4>
            <input type="text" placeholder="컨텍스트 키 (생략 가능)" value={conditionKey} onChange={e => setConditionKey(e.target.value)} />
            <select value={conditionOp} onChange={e => setConditionOp(e.target.value as any)}>
              <option value="==">==</option>
              <option value="!=">!=</option>
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value="exists">exists</option>
              <option value="not exists">not exists</option>
            </select>
            <input type="text" placeholder="비교 값" value={conditionValue} onChange={e => setConditionValue(e.target.value)} />

            <h4>액션 (THEN)</h4>
            <select value={actionType} onChange={e => { setActionType(e.target.value as any); setActionParams([]); }}>
              {availableActions.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <div className={styles.actionParams}>
              {renderActionParams()}
            </div>

            <div className={styles.formButtons}>
              <button onClick={handleSave}>저장</button>
              <button onClick={() => setIsCreating(false)}>취소</button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};

export default CustomTriggerPanel;
