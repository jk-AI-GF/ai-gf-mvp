import React from 'react';
import Panel from './Panel';
import styles from './CreatorPanel.module.css';
import { useAppContext } from '../contexts/AppContext';

interface CreatorPanelProps {
  onClose: () => void;
  onOpenContextViewer: () => void;
  onOpenCharacterStateViewer: () => void;
  onOpenSequenceEditor: (sequenceFile: string | null) => void;
  onEditSequence: (sequenceFile: string) => void;
  onDeleteSequence: (sequenceFile: string) => void;
  sequences: { name: string, type: 'sequence' | 'subroutine' }[];
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
  activeSequences: string[];
  onManualStartSequence: (sequenceFile: string) => void;
}

const CreatorPanel: React.FC<CreatorPanelProps> = ({ 
  onClose, 
  onOpenContextViewer,
  onOpenCharacterStateViewer,
  onOpenSequenceEditor,
  onEditSequence,
  onDeleteSequence,
  sequences,
  initialPos, 
  onDragEnd,
  activeSequences,
  onManualStartSequence,
}) => {
  const { actionRegistry } = useAppContext();

  const handleToggleSequence = (sequenceFile: string, shouldActivate: boolean) => {
    if (!actionRegistry) {
      console.error("ActionRegistry not available.");
      return;
    }

    const action = actionRegistry.get('toggleSequence')?.implementation;

    if (action) {
      action(sequenceFile, shouldActivate);
    } else {
      console.error(`Action "toggleSequence" not found.`);
    }
  };

  return (
    <Panel title="크리에이터 패널" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.container}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>시퀀스 & 서브루틴</h3>
          <div className={styles.itemList}>
            {sequences.length === 0 ? (
              <p className={styles.emptyMessage}>생성된 시퀀스가 없습니다.</p>
            ) : (
              sequences.map(sequence => (
                <div key={sequence.name} className={styles.item}>
                  <span className={styles.itemName} title={sequence.name}>
                    {sequence.name.replace('.json', '')}
                    <span className={styles.typeIndicator}>
                      {sequence.type === 'subroutine' ? '(Sub)' : ''}
                    </span>
                  </span>
                  <div className={styles.controls}>
                    <button 
                      className={`${styles.controlButton} ${styles.deleteButton}`} 
                      onClick={() => onDeleteSequence(sequence.name)}
                    >
                      삭제
                    </button>
                    <button 
                      className={`${styles.controlButton} ${styles.editButton}`} 
                      onClick={() => onEditSequence(sequence.name)}
                    >
                      편집
                    </button>
                    {sequence.type !== 'subroutine' && (
                      <button 
                        className={`${styles.controlButton} ${styles.runButton}`} 
                        onClick={() => onManualStartSequence(sequence.name)}
                      >
                        실행
                      </button>
                    )}
                    <label className={styles.switch} title={sequence.type === 'subroutine' ? "서브루틴은 직접 활성화할 수 없습니다" : "활성화/비활성화"}>
                      <input 
                        type="checkbox" 
                        checked={activeSequences.includes(sequence.name)}
                        onChange={(e) => handleToggleSequence(sequence.name, e.target.checked)}
                        disabled={sequence.type === 'subroutine'}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className={styles.primaryButton} onClick={() => onOpenSequenceEditor(null)}>
            새 시퀀스/서브루틴 만들기
          </button>
        </div>
        <div className={styles.section}>
           <h3 className={styles.sectionTitle}>디버그 도구</h3>
           <button className={styles.secondaryButton} onClick={onOpenContextViewer}>
            컨텍스트 스토어 뷰어
          </button>
          <button className={styles.secondaryButton} onClick={onOpenCharacterStateViewer} style={{marginTop: '10px'}}>
            CharacterState 뷰어
          </button>
        </div>
      </div>
    </Panel>
  );
};

export default CreatorPanel;

