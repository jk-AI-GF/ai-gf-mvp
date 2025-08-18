import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
    <Panel title={t('creatorPanel.title')} onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.container}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('creatorPanel.sequencesTitle')}</h3>
          <div className={styles.itemList}>
            {sequences.length === 0 ? (
              <p className={styles.emptyMessage}>{t('creatorPanel.noSequences')}</p>
            ) : (
              sequences.map(sequence => (
                <div key={sequence.name} className={styles.item}>
                  <span className={styles.itemName} title={sequence.name}>
                    {sequence.name.replace('.json', '')}
                    <span className={styles.typeIndicator}>
                      {sequence.type === 'subroutine' ? t('creatorPanel.subroutineIndicator') : ''}
                    </span>
                  </span>
                  <div className={styles.controls}>
                    <button 
                      className={`${styles.controlButton} ${styles.deleteButton}`} 
                      onClick={() => onDeleteSequence(sequence.name)}
                    >
                      {t('creatorPanel.delete')}
                    </button>
                    <button 
                      className={`${styles.controlButton} ${styles.editButton}`} 
                      onClick={() => onEditSequence(sequence.name)}
                    >
                      {t('creatorPanel.edit')}
                    </button>
                    {sequence.type !== 'subroutine' && (
                      <button 
                        className={`${styles.controlButton} ${styles.runButton}`} 
                        onClick={() => onManualStartSequence(sequence.name)}
                      >
                        {t('creatorPanel.run')}
                      </button>
                    )}
                    <label className={styles.switch} title={sequence.type === 'subroutine' ? t('creatorPanel.subroutineTooltip') : t('creatorPanel.toggleTooltip')}>
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
            {t('creatorPanel.newSequence')}
          </button>
        </div>
        <div className={styles.section}>
           <h3 className={styles.sectionTitle}>{t('creatorPanel.debugToolsTitle')}</h3>
           <button className={styles.secondaryButton} onClick={onOpenContextViewer}>
            {t('creatorPanel.contextStoreViewer')}
          </button>
          <button className={styles.secondaryButton} onClick={onOpenCharacterStateViewer} style={{marginTop: '10px'}}>
            {t('creatorPanel.characterStateViewer')}
          </button>
        </div>
      </div>
    </Panel>
  );
};

export default CreatorPanel;

