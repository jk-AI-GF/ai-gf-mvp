import React, { useRef, MouseEvent } from 'react';
import styles from './TimelineView.module.css';

interface TimelineViewProps {
  duration: number;
  currentTime: number;
  keyframes: number[];
  onTimeChange: (newTime: number) => void;
}

const TICK_INTERVAL = 1; // 1초 간격으로 큰 눈금
const SUB_TICK_COUNT = 4; // 큰 눈금 사이의 작은 눈금 수 (0.25초 간격)
const PIXELS_PER_SECOND = 60; // 1초당 픽셀 너비

const TimelineView: React.FC<TimelineViewProps> = ({
  duration,
  currentTime,
  keyframes,
  onTimeChange,
}) => {
  const timelineRef = useRef<SVGSVGElement>(null);
  const totalWidth = duration * PIXELS_PER_SECOND;

  const handleTimelineClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(duration, x / PIXELS_PER_SECOND));
    onTimeChange(newTime);
  };

  const renderTicks = () => {
    const ticks = [];
    const numTicks = Math.floor(duration / TICK_INTERVAL);

    for (let i = 0; i <= numTicks; i++) {
      const time = i * TICK_INTERVAL;
      const x = time * PIXELS_PER_SECOND;
      ticks.push(
        <g key={`tick-${i}`}>
          <line x1={x} y1="15" x2={x} y2="30" className={styles.majorTick} />
          <text x={x + 2} y="12" className={styles.tickLabel}>
            {time}s
          </text>
        </g>
      );

      if (i < numTicks) {
        for (let j = 1; j <= SUB_TICK_COUNT; j++) {
          const subTime = time + j * (TICK_INTERVAL / (SUB_TICK_COUNT + 1));
          const subX = subTime * PIXELS_PER_SECOND;
          ticks.push(
            <line key={`subtick-${i}-${j}`} x1={subX} y1="20" x2={subX} y2="30" className={styles.minorTick} />
          );
        }
      }
    }
    return ticks;
  };

  const renderKeyframes = () => {
    // 중복된 키프레임 시간을 제거하여 시각적 클러터 방지
    const uniqueKeyframeTimes = [...new Set(keyframes)];
    return uniqueKeyframeTimes.map((time, index) => {
      const x = time * PIXELS_PER_SECOND;
      return (
        <path
          key={`key-${index}`}
          d={`M${x} 22 L${x + 5} 27 L${x} 32 L${x - 5} 27 Z`}
          className={styles.keyframeMarker}
        />
      );
    });
  };

  const playheadX = currentTime * PIXELS_PER_SECOND;

  return (
    <div className={styles.container}>
      <svg
        ref={timelineRef}
        className={styles.timelineSvg}
        width={totalWidth}
        height="40"
        onClick={handleTimelineClick}
      >
        <rect x="0" y="0" width={totalWidth} height="40" className={styles.background} />
        <g>{renderTicks()}</g>
        <g>{renderKeyframes()}</g>
        {/* Playhead */}
        <g className={styles.playhead} transform={`translate(${playheadX}, 0)`}>
          <line x1="0" y1="0" x2="0" y2="40" />
          <polygon points="0,0 -5,10 5,10" />
        </g>
      </svg>
    </div>
  );
};

export default TimelineView;
