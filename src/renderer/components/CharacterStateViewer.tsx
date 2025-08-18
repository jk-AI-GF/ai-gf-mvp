import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Panel from './Panel';
import { useAppContext } from '../contexts/AppContext';
import styles from './CharacterStateViewer.module.css';
import { ICharacterState } from '../../plugin-api/plugin-context';

interface CharacterStateViewerProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const CharacterStateViewer: React.FC<CharacterStateViewerProps> = ({ onClose, initialPos, onDragEnd }) => {
  const { t } = useTranslation();
  const { pluginManager } = useAppContext();
  const [state, setState] = useState<ICharacterState | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('N/A');

  useEffect(() => {
    const updateState = () => {
      if (pluginManager) {
        const cs = pluginManager.context.characterState;
        // Create a new plain object by explicitly reading from the getters
        const newState: ICharacterState = {
          characterName: cs.characterName,
          userName: cs.userName,
          curiosity: cs.curiosity,
          happiness: cs.happiness,
          energy: cs.energy,
          lastInteractionTimestamp: cs.lastInteractionTimestamp,
        };
        setState(newState);

        if (newState.lastInteractionTimestamp) {
          const secondsAgo = Math.floor((Date.now() - newState.lastInteractionTimestamp) / 1000);
          setElapsedTime(t('characterStateViewer.secondsAgo', { seconds: secondsAgo }));
        }
      }
    };

    updateState(); // Initial update
    const interval = setInterval(updateState, 500); // Poll for updates

    return () => clearInterval(interval);
  }, [pluginManager, t]);

  return (
    <Panel title={t('characterStateViewer.title')} onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.container}>
        {state ? (
          <>
            <div className={styles.stateItem}>
              <span className={styles.stateKey}>{t('characterStateViewer.characterName')}</span>
              <span className={styles.stateValue}>{state.characterName}</span>
            </div>
            <div className={styles.stateItem}>
              <span className={styles.stateKey}>{t('characterStateViewer.userName')}</span>
              <span className={styles.stateValue}>{state.userName}</span>
            </div>
            <div className={styles.stateItem}>
              <span className={styles.stateKey}>{t('characterStateViewer.curiosity')}</span>
              <span className={styles.stateValue}>{state.curiosity.toFixed(3)}</span>
            </div>
            <div className={styles.stateItem}>
              <span className={styles.stateKey}>{t('characterStateViewer.happiness')}</span>
              <span className={styles.stateValue}>{state.happiness.toFixed(3)}</span>
            </div>
            <div className={styles.stateItem}>
              <span className={styles.stateKey}>{t('characterStateViewer.energy')}</span>
              <span className={styles.stateValue}>{state.energy.toFixed(3)}</span>
            </div>
            <div className={styles.stateItem}>
              <span className={styles.stateKey}>{t('characterStateViewer.lastInteraction')}</span>
              <span className={styles.stateValue}>{elapsedTime}</span>
            </div>
          </>
        ) : (
          <p>{t('characterStateViewer.loading')}</p>
        )}
      </div>
    </Panel>
  );
};

export default CharacterStateViewer;
