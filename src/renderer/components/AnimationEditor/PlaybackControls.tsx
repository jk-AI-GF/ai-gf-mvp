import React from 'react';
import styles from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onGoToStart: () => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlay,
  onPause,
  onGoToStart,
}) => {
  return (
    <div className={styles.controlsContainer}>
      <button onClick={onGoToStart} className={styles.controlButton}>⏮</button>
      {isPlaying ? (
        <button onClick={onPause} className={styles.controlButton}>❚❚</button>
      ) : (
        <button onClick={onPlay} className={styles.controlButton}>▶</button>
      )}
    </div>
  );
};

export default PlaybackControls;
