import React from 'react';
import * as THREE from 'three';
import styles from './TrackListView.module.css';

interface TrackListViewProps {
  animationClip: THREE.AnimationClip;
  selectedTrackName: string | null;
  onTrackSelect: (trackName: string) => void;
}

const TrackListView: React.FC<TrackListViewProps> = ({ 
  animationClip, 
  selectedTrackName, 
  onTrackSelect 
}) => {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>트랙 목록</h3>
      <div className={styles.list}>
        {animationClip.tracks.map((track) => (
          <button
            key={track.name}
            className={`${styles.trackButton} ${track.name === selectedTrackName ? styles.selected : ''}`}
            onClick={() => onTrackSelect(track.name)}
            title={track.name}
          >
            {track.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TrackListView;
