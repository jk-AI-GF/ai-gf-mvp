import React, { useState, useEffect } from 'react';
import { VRM } from '@pixiv/three-vrm';
import Panel from './Panel'; // Import the generic Panel component

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
  const [expressions, setExpressions] = useState<ExpressionInfo[]>([]);
  const [vrm, setVrm] = useState<VRM | null>(null);

  useEffect(() => {
    const currentVrm = (window as any).currentVrm as VRM | undefined;
    if (currentVrm?.expressionManager) {
      setVrm(currentVrm);
      const expressionMap = currentVrm.expressionManager.expressionMap;
      const initialExpressions = Object.keys(expressionMap).map(name => ({
        name,
        value: (currentVrm.expressionManager.getValue(name) || 0) * 100,
      }));
      setExpressions(initialExpressions);
    }
  }, []);

  const handleSliderChange = (name: string, value: number) => {
    if (vrm?.expressionManager) {
      const weight = value / 100;
      vrm.expressionManager.setValue(name, weight);
      vrm.expressionManager.update();
      setExpressions(expressions.map(exp => exp.name === name ? { ...exp, value } : exp));
    }
  };

  return (
    <Panel title="표정 조절" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      {!vrm ? (
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
              onChange={(e) => handleSliderChange(name, parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        ))
      )}
    </Panel>
  );
};

export default ExpressionPanel;
