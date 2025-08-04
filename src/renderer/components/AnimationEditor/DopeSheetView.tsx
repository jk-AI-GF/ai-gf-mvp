import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import styles from './DopeSheetView.module.css';

interface DopeSheetViewProps {
  animationClip: THREE.AnimationClip;
  currentTime: number;
  onTimeChange: (newTime: number) => void;
  // TODO: Add props for keyframe selection
}

const PIXELS_PER_SECOND = 60; // 1초당 픽셀 너비
const TRACK_HEIGHT = 24; // 각 트랙의 높이
const RULER_HEIGHT = 30; // 시간 눈금자 높이
const TRACK_NAME_WIDTH = 200; // 트랙 이름 영역 너비

const DopeSheetView: React.FC<DopeSheetViewProps> = ({
  animationClip,
  currentTime,
  onTimeChange,
}) => {
  const { duration, tracks } = animationClip;
  const totalWidth = duration * PIXELS_PER_SECOND;
  const totalHeight = tracks.length * TRACK_HEIGHT;

  const rulerRef = useRef<HTMLDivElement>(null);
  const trackListRef = useRef<HTMLDivElement>(null);
  const keyframeGridRef = useRef<HTMLDivElement>(null);

  // Scroll Synchronization
  const handleGridScroll = () => {
    if (keyframeGridRef.current && rulerRef.current && trackListRef.current) {
      rulerRef.current.scrollLeft = keyframeGridRef.current.scrollLeft;
      trackListRef.current.scrollTop = keyframeGridRef.current.scrollTop;
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!keyframeGridRef.current) return;
    const rect = keyframeGridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + keyframeGridRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(duration, x / PIXELS_PER_SECOND));
    onTimeChange(newTime);
  };

  const playheadX = currentTime * PIXELS_PER_SECOND;

  return (
    <div className={styles.dopeSheetContainer}>
      {/* Upper Left Corner (Empty) */}
      <div className={styles.corner} style={{ height: RULER_HEIGHT, width: TRACK_NAME_WIDTH }}></div>

      {/* Time Ruler (Top) */}
      <div className={styles.rulerContainer} ref={rulerRef} style={{ height: RULER_HEIGHT }}>
        <div className={styles.ruler} style={{ width: totalWidth }}>
          {Array.from({ length: Math.floor(duration) + 1 }).map((_, i) => (
            <div key={i} className={styles.majorTick} style={{ left: i * PIXELS_PER_SECOND }}>
              {i}s
            </div>
          ))}
        </div>
      </div>

      {/* Track List (Left) */}
      <div className={styles.trackListContainer} ref={trackListRef} style={{ width: TRACK_NAME_WIDTH }}>
        <div className={styles.trackList} style={{ height: totalHeight }}>
          {tracks.map((track, index) => (
            <div key={index} className={styles.trackName} style={{ height: TRACK_HEIGHT }}>
              {track.name}
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe Grid (Main Area) */}
      <div 
        className={styles.keyframeGridContainer} 
        ref={keyframeGridRef} 
        onScroll={handleGridScroll}
        onClick={handleTimelineClick}
      >
        <div className={styles.keyframeGrid} style={{ width: totalWidth, height: totalHeight }}>
          {/* Render track rows */}
          {tracks.map((track, trackIndex) => (
            <div key={trackIndex} className={styles.trackRow} style={{ height: TRACK_HEIGHT }}>
              {/* Render keyframes for this track */}
              {Array.from(track.times).map((time, keyIndex) => (
                <div
                  key={keyIndex}
                  className={styles.keyframeMarker}
                  style={{ left: time * PIXELS_PER_SECOND }}
                ></div>
              ))}
            </div>
          ))}
          {/* Playhead */}
          <div className={styles.playhead} style={{ left: playheadX }}></div>
        </div>
      </div>
    </div>
  );
};

export default DopeSheetView;
