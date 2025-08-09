import React, { useState, useEffect } from 'react';
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
  const { pluginManager } = useAppContext();
  const [state, setState] = useState<ICharacterState | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('N/A');

  useEffect(() => {
    const updateState = () => {
      if (pluginManager) {
        const cs = pluginManager.context.characterState;
        // Create a new plain object by explicitly reading from the getters
        const newState: ICharacterState = {
          curiosity: cs.curiosity,
          happiness: cs.happiness,
          energy: cs.energy,
          lastInteractionTimestamp: cs.lastInteractionTimestamp,
        };
        setState(newState);

        if (newState.lastInteractionTimestamp) {
          const secondsAgo = Math.floor((Date.now() - newState.lastInteractionTimestamp) / 1000);
          setElapsedTime(`${secondsAgo}s ago`);
        }
      }
    };

    updateState(); // Initial update
    const interval = setInterval(updateState, 500); // Poll for updates

    return () => clearInterval(interval);
  }, [pluginManager]);

  return (
    <Panel title="Character State" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.container}>
        {state ? (
          <>
            <div className={styles.stateItem}>
              <span className={styles.stateKey}>Curiosity:</span>
              <span className={styles.stateValue}>{state.curiosity.toFixed(3)}</span>
            </div>
            <div className={styles.stateItem}>
              <span className={styles.stateKey}>Happiness:</span>
              <span className={styles.stateValue}>{state.happiness.toFixed(3)}</span>
            </div>
            <div className={styles.stateItem}>
              <span className={styles.stateKey}>Energy:</span>
              <span className={styles.stateValue}>{state.energy.toFixed(3)}</span>
            </div>
            <div className={styles.stateItem}>
              <span className={styles.stateKey}>Last Interaction:</span>
              <span className={styles.stateValue}>{elapsedTime}</span>
            </div>
          </>
        ) : (
          <p>Loading character state...</p>
        )}
      </div>
    </Panel>
  );
};

export default CharacterStateViewer;
