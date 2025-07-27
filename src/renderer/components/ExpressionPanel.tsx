import React, { useState, useEffect } from 'react';
import Panel from './Panel';
import { useAppContext } from '../contexts/AppContext';
import eventBus from '../../core/event-bus';

interface ExpressionPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

type ExpressionInfo = {
  name: string;
  value: number;
};

const ExpressionPanel: React.FC<ExpressionPanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const { pluginManager } = useAppContext();
  const [expressions, setExpressions] = useState<ExpressionInfo[]>([]);
  const [isVrmLoaded, setIsVrmLoaded] = useState(false);

  useEffect(() => {
    const handleVrmLoad = (data: { expressionNames: string[] }) => {
      const initialExpressions = data.expressionNames.map(name => ({
        name,
        value: 0, // Start all at 0
      }));
      setExpressions(initialExpressions);
      setIsVrmLoaded(true);
    };

    const handleVrmUnload = () => {
      setExpressions([]);
      setIsVrmLoaded(false);
    };

    const unsubLoad = eventBus.on('vrm:loaded', handleVrmLoad);
    const unsubUnload = eventBus.on('vrm:unloaded', handleVrmUnload);

    // Request initial state in case VRM is already loaded
    if (pluginManager?.context.vrmManager?.currentVrm) {
        const vrm = pluginManager.context.vrmManager.currentVrm;
        handleVrmLoad({ expressionNames: Object.keys(vrm.expressionManager.expressionMap) });
    }


    return () => {
      unsubLoad();
      unsubUnload();
    };
  }, [pluginManager]);

  const handleSliderChange = (name: string, value: number) => {
    if (pluginManager) {
      const weight = value / 100;
      // Use the new action to set expression weight without affecting others
      pluginManager.context.actions.setExpressionWeight(name, weight);
      
      // Update local state to reflect the change immediately on the slider
      setExpressions(currentExpressions =>
        currentExpressions.map(exp =>
          exp.name === name ? { ...exp, value } : exp
        )
      );
    }
  };

  return (
    <Panel title="표정 조절" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      {!isVrmLoaded ? (
        <p className="empty-message">VRM 모델을 로드해주세요.</p>
      ) : (
        expressions.map(({ name, value }) => (
          <div key={name} style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>{name}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={value}
              onChange={(e) => handleSliderChange(name, parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </div>
        ))
      )}
    </Panel>
  );
};

export default ExpressionPanel;
