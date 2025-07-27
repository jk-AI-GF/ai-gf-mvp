import React, { useState, useEffect, useRef } from 'react';
import { VRM } from '@pixiv/three-vrm';
import { useDraggable } from '../hooks/useDraggable';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const { x, y } = useDraggable({ handleRef, initialPos, onDragEnd });

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
    <div className={`panel-container ${isCollapsed ? 'collapsed' : ''}`} style={{ top: y, left: x }}>
      <div className="panel-header" ref={handleRef} style={{ cursor: 'move' }}>
        <h3 className="panel-title">표정 조절</h3>
        <div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="panel-close-button" style={{ right: '40px' }}>{isCollapsed ? '□' : '−'}</button>
          <button onClick={onClose} className="panel-close-button">×</button>
        </div>
      </div>
      <div className="panel-content">
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
      </div>
    </div>
  );
};

export default ExpressionPanel;
