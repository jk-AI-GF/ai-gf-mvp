import React, { useState, useEffect } from 'react';
import { VRM } from '@pixiv/three-vrm';

interface ExpressionPanelProps {
  onClose: () => void;
}

type ExpressionInfo = {
  name: string;
  value: number;
};

const ExpressionPanel: React.FC<ExpressionPanelProps> = ({ onClose }) => {
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
    <div className="control-panel" style={{ display: 'block', maxHeight: '80vh', overflowY: 'auto' }}>
      <button className="control-panel-minimize-button">-</button>
      <button className="control-panel-close-button" onClick={onClose}>×</button>
      <h3>표정 조절</h3>
      <div id="expression-sliders">
        {!vrm ? (
          <p style={{ color: 'white' }}>VRM을 로드해주세요.</p>
        ) : (
          expressions.map(({ name, value }) => (
            <div key={name} style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block' }}>{name}</label>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => handleSliderChange(name, parseInt(e.target.value))}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpressionPanel;
