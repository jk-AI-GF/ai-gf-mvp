import React, { useState, useEffect } from 'react';
import Panel from './Panel';
import styles from './CreatorPanel.module.css';
import { CustomTrigger } from '../../core/custom-trigger-manager';

interface CreatorPanelProps {
  onClose: () => void;
  onOpenTriggerEditor: (trigger: CustomTrigger | null) => void;
  onEditTrigger: (trigger: CustomTrigger) => void;
  onDeleteTrigger: (triggerId: string) => void;
  onToggleTrigger: (triggerId: string, enabled: boolean) => void;
  onOpenContextViewer: () => void;
  onOpenSequenceEditor: (sequenceFile: string | null) => void;
  onEditSequence: (sequenceFile: string) => void;
  onDeleteSequence: (sequenceFile: string) => void;
  triggers: CustomTrigger[];
  sequences: string[];
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
  activeSequences: string[];
  onToggleSequence: (sequenceFile: string, shouldActivate: boolean) => void;
  onManualStartSequence: (sequenceFile: string) => void;
}

const CreatorPanel: React.FC<CreatorPanelProps> = ({ 
  onClose, 
  onOpenTriggerEditor, 
  onEditTrigger,
  onDeleteTrigger,
  onToggleTrigger,
  onOpenContextViewer,
  onOpenSequenceEditor,
  onEditSequence,
  onDeleteSequence,
  triggers,
  sequences,
  initialPos, 
  onDragEnd,
  activeSequences,
  onToggleSequence,
  onManualStartSequence,
}) => {
  return (
    <Panel title="크리에이터 패널" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.container}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>시퀀스</h3>
          <div className={styles.triggerList}>
            {sequences.length === 0 && <p className={styles.emptyMessage}>생성된 시퀀스가 없습니다.</p>}
            {sequences.map(sequenceFile => (
              <div key={sequenceFile} className={styles.triggerItem}>
                <span className={styles.triggerName}>{sequenceFile.replace('.json', '')}</span>
                <div className={styles.controls}>
                  <button className={`${styles.controlButton} ${styles.deleteButton}`} onClick={() => onDeleteSequence(sequenceFile)}>삭제</button>
                  <button className={`${styles.controlButton} ${styles.editButton}`} onClick={() => onEditSequence(sequenceFile)}>편집</button>
                  <button className={`${styles.controlButton} ${styles.runButton}`} onClick={() => onManualStartSequence(sequenceFile)}>실행</button>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={activeSequences.includes(sequenceFile)}
                      onChange={(e) => onToggleSequence(sequenceFile, e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button className={styles.addButton} onClick={() => onOpenSequenceEditor(null)}>
            새 시퀀스 만들기
          </button>
        </div>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>커스텀 트리거 (Legacy)</h3>
          <div className={styles.triggerList}>
            {triggers.length === 0 && <p className={styles.emptyMessage}>생성된 트리거가 없습니다.</p>}
            {triggers.map(trigger => (
              <div key={trigger.id} className={styles.triggerItem}>
                <span className={styles.triggerName}>{trigger.name}</span>
                <div className={styles.controls}>
                  <button className={`${styles.controlButton} ${styles.editButton}`} onClick={() => onEditTrigger(trigger)}>수정</button>
                  <button className={`${styles.controlButton} ${styles.deleteButton}`} onClick={() => onDeleteTrigger(trigger.id)}>삭제</button>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={trigger.enabled} 
                      onChange={(e) => onToggleTrigger(trigger.id, e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button className={styles.addButton} onClick={() => onOpenTriggerEditor(null)}>
            새 트리거 추가
          </button>
        </div>
        <div className={styles.section}>
           <h3 className={styles.sectionTitle}>디버그 도구</h3>
           <button className={styles.debugButton} onClick={onOpenContextViewer}>
            컨텍스트 스토어 뷰어
          </button>
        </div>
      </div>
    </Panel>
  );
};

export default CreatorPanel;
