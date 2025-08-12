import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import styles from './KeyframeEditor.module.css';

interface KeyframeEditorProps {
  animationClip: THREE.AnimationClip | null;
  selectedKeyframe: { trackName: string; keyIndex: number } | null;
  onKeyframeUpdate: (trackName: string, keyIndex: number, newTime: number, newValue: number[]) => void;
}

const VALUE_LABELS = ['x', 'y', 'z', 'w'];

const KeyframeEditor: React.FC<KeyframeEditorProps> = ({
  animationClip,
  selectedKeyframe,
  onKeyframeUpdate,
}) => {
  const [time, setTime] = useState('');
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    if (selectedKeyframe && animationClip) {
      const track = animationClip.tracks.find(t => t.name === selectedKeyframe.trackName);
      if (track) {
        const keyIndex = selectedKeyframe.keyIndex;
        const valueSize = track.getValueSize();
        setTime(track.times[keyIndex].toFixed(4));
        const newValues = Array.from(track.values.slice(keyIndex * valueSize, (keyIndex + 1) * valueSize));
        setValues(newValues.map(v => v.toFixed(4)));
      }
    }
  }, [selectedKeyframe, animationClip]);

  if (!selectedKeyframe || !animationClip) {
    return (
      <div className={styles.editorContainer}>
        <p className={styles.placeholder}>키프레임을 선택하세요.</p>
      </div>
    );
  }

  const { trackName, keyIndex } = selectedKeyframe;
  const track = animationClip.tracks.find(t => t.name === trackName);

  if (!track) {
    return <div className={styles.editorContainer}><p className={styles.error}>트랙을 찾을 수 없습니다.</p></div>;
  }

  const handleValueChange = (index: number, newValue: string) => {
    const newValues = [...values];
    newValues[index] = newValue;
    setValues(newValues);
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
  };

  const handleApplyChanges = () => {
    const newNumericValues = values.map(v => parseFloat(v));
    const newNumericTime = parseFloat(time);

    if (newNumericValues.some(isNaN) || isNaN(newNumericTime)) {
      console.error("Invalid number format");
      return;
    }
    onKeyframeUpdate(trackName, keyIndex, newNumericTime, newNumericValues);
  };

  return (
    <div className={styles.editorContainer}>
      <h3 className={styles.title} title={trackName}>{trackName}</h3>
      <div className={styles.field}>
        <label>Time</label>
        <input 
          type="number" 
          value={time}
          onChange={(e) => handleTimeChange(e.target.value)}
          onBlur={handleApplyChanges}
        />
      </div>
      <div className={styles.field}>
        <label>Value</label>
        <div className={styles.valueGrid}>
          {values.map((val, i) => (
            <React.Fragment key={i}>
              <label className={styles.valueLabel}>{VALUE_LABELS[i]}</label>
              <input 
                type="number" 
                value={val}
                onChange={(e) => handleValueChange(i, e.target.value)}
                onBlur={handleApplyChanges}
              />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyframeEditor;
