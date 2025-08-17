import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import eventBus from '../../core/event-bus';
import styles from './ExpressionPanel.module.css';

const ExpressionPanel: React.FC = () => {
  const { vrmManager } = useAppContext();
  const [expressions, setExpressions] = useState<string[]>([]);
  const [expressionValues, setExpressionValues] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const handleVrmLoaded = (data: { expressionNames: string[] }) => {
      setExpressions(data.expressionNames);
      const initialValues: { [key: string]: number } = {};
      data.expressionNames.forEach(name => initialValues[name] = 0);
      setExpressionValues(initialValues);
    };

    const unsubscribe = eventBus.on('vrm:loaded', handleVrmLoaded);
    
    // Also check if a VRM is already loaded on mount
    if (vrmManager?.currentVrm) {
      const expressionNames = Object.keys(vrmManager.currentVrm.expressionManager.expressionMap);
      handleVrmLoaded({ expressionNames });
    }

    return () => unsubscribe();
  }, [vrmManager]);

  const handleSliderChange = (name: string, value: number) => {
    if (vrmManager?.currentVrm?.expressionManager) {
      vrmManager.currentVrm.expressionManager.setValue(name, value);
      setExpressionValues(prev => ({ ...prev, [name]: value }));
    }
  };

  if (expressions.length === 0) {
    return <div className={styles.container}>VRM 모델을 먼저 로드해주세요.</div>;
  }

  return (
    <div className={styles.container}>
      {expressions.map(name => (
        <div key={name} className={styles.sliderGroup}>
          <label htmlFor={name}>{name}</label>
          <input
            type="range"
            id={name}
            min="0"
            max="1"
            step="0.01"
            value={expressionValues[name] || 0}
            onChange={(e) => handleSliderChange(name, parseFloat(e.target.value))}
          />
        </div>
      ))}
    </div>
  );
};

export default ExpressionPanel;
