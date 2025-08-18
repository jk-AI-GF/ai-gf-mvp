import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../contexts/AppContext';
import styles from './VrmScaleSlider.module.css';

const VrmScaleSlider: React.FC = () => {
  const { t } = useTranslation();
  const { vrmManager } = useAppContext();
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    if (!vrmManager) return;

    const handleVrmScaled = (event: { scale: number }) => {
      setScale(event.scale);
    };

    // vrm:loaded 이벤트 발생 시 슬라이더 값을 1.0으로 리셋합니다.
    const handleVrmLoad = () => {
      setScale(1.0);
    };

    vrmManager.eventBus.on('vrm:scaled', handleVrmScaled);
    vrmManager.eventBus.on('vrm:loaded', handleVrmLoad);

    return () => {
      vrmManager.eventBus.off('vrm:scaled', handleVrmScaled);
      vrmManager.eventBus.off('vrm:loaded', handleVrmLoad);
    };
  }, [vrmManager]);

  const handleScaleChange = useCallback((newScale: number) => {
    vrmManager?.setScale(newScale);
  }, [vrmManager]);

  if (!vrmManager?.currentVrm) {
    return null;
  }

  return (
    <div className={styles.sliderContainer}>
      <label htmlFor="vrmScale" className={styles.sliderLabel}>{t('vrmScaleSlider.scale')}</label>
      <input
        type="range"
        id="vrmScale"
        min="0.1"
        max="3.0"
        step="0.01"
        value={scale}
        onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
        className={styles.slider}
      />
      <span>{scale.toFixed(2)}</span>
    </div>
  );
};

export default VrmScaleSlider;
