import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAppContext } from '../../contexts/AppContext';
import Panel from '../Panel';
import styles from './AnimationEditPanel.module.css';
import { parseVrma, serializeVrma } from './vrma-parser';
import DopeSheetView from './DopeSheetView';
import PlaybackControls from './PlaybackControls';
import KeyframeEditor from './KeyframeEditor';

interface SelectedKeyframe {
  trackName: string;
  keyIndex: number;
}

interface AnimationEditPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
  animationName: string | null;
}

const AnimationEditPanel: React.FC<AnimationEditPanelProps> = ({ 
  onClose, 
  initialPos, 
  onDragEnd, 
  animationName 
}) => {
  const { vrmManager } = useAppContext();
  const [animationClip, setAnimationClip] = useState<THREE.AnimationClip | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedKeyframe, setSelectedKeyframe] = useState<SelectedKeyframe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const animationFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Load and parse the animation file
  useEffect(() => {
    if (!animationName) {
      setError('애니메이션 파일 이름이 제공되지 않았습니다.');
      setIsLoading(false);
      return;
    }

    const loadAndParseAnimation = async () => {
      setIsLoading(true);
      setError(null);
      setAnimationClip(null);
      setCurrentTime(0);
      setIsPlaying(false);
      setSelectedKeyframe(null);

      try {
        const userPath = await window.electronAPI.resolvePath('userData', `animations/${animationName}`);
        const assetPath = await window.electronAPI.resolvePath('assets', `Animation/${animationName}`);
        
        let filePath: string | null = null;
        if (await window.electronAPI.fileExists(userPath)) {
          filePath = userPath;
        } else if (await window.electronAPI.fileExists(assetPath)) {
          filePath = assetPath;
        }

        if (!filePath) {
          throw new Error(`애니메이션 파일을 찾을 수 없습니다: ${animationName}`);
        }
        
        if (!vrmManager?.currentVrm) {
          throw new Error('애니메이션을 파싱하기 위해 VRM 모델이 먼저 로드되어야 합니다.');
        }

        const result = await window.electronAPI.readAbsoluteFile(filePath);
        if (!(result instanceof ArrayBuffer)) {
          throw new Error('파일을 ArrayBuffer 형식으로 읽지 못했습니다.');
        }

        const clip = await parseVrma(result, animationName, vrmManager.currentVrm);
        setAnimationClip(clip);
        console.log('Parsed AnimationClip:', clip);
        console.log('Track names:', clip.tracks.map(t => t.name));

      } catch (err) {
        console.error('Failed to load and parse animation:', err);
        setError(err.message || '애니메이션을 로드하고 파싱하는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAndParseAnimation();
  }, [animationName, vrmManager]);

  // Animation playback loop
  const animate = (time: number) => {
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
    }
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    setCurrentTime(prevTime => {
      const newTime = prevTime + deltaTime;
      if (animationClip && newTime >= animationClip.duration) {
        setIsPlaying(false);
        return animationClip.duration;
      }
      return newTime;
    });

    animationFrameId.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null; // Reset lastTime on play
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, animationClip]);

  // Update VRM model pose when currentTime changes
  useEffect(() => {
    if (vrmManager && animationClip) {
      vrmManager.sampleAnimationClip(animationClip, currentTime);
    }
  }, [currentTime, animationClip, vrmManager]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (vrmManager) {
        vrmManager.resetToTPose();
      }
    };
  }, [vrmManager]);


  if (!animationName) return null;

  const handleTimeChange = (newTime: number) => {
    if (!isPlaying) {
      setCurrentTime(newTime);
    }
  };

  const handlePlay = () => {
    if (!animationClip) return;
    if (currentTime >= animationClip.duration) {
      setCurrentTime(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleGoToStart = () => {
    if (!isPlaying) {
      setCurrentTime(0);
    }
  };

  const handleKeyframeSelect = (trackName: string, keyIndex: number) => {
    setSelectedKeyframe({ trackName, keyIndex });
    // Also move playhead to the selected keyframe's time
    const track = animationClip?.tracks.find(t => t.name === trackName);
    if (track) {
      handleTimeChange(track.times[keyIndex]);
    }
  };

  const handleKeyframeUpdate = (trackName: string, keyIndex: number, newTime: number, newValue: number[]) => {
    if (!animationClip) return;

    const newClip = animationClip.clone();
    const track = newClip.tracks.find(t => t.name === trackName);

    if (track) {
      // Update value
      const valueSize = track.getValueSize();
      for (let i = 0; i < valueSize; i++) {
        track.values[keyIndex * valueSize + i] = newValue[i];
      }

      // Update time and re-sort if necessary
      track.times[keyIndex] = newTime;

      // Simple bubble-swap to re-sort if time has changed
      // A more robust solution would use a stable sort algorithm
      let swapped;
      do {
        swapped = false;
        for (let i = 0; i < track.times.length - 1; i++) {
          if (track.times[i] > track.times[i+1]) {
            // Swap time
            [track.times[i], track.times[i+1]] = [track.times[i+1], track.times[i]];
            // Swap corresponding values
            const val1 = Array.from(track.values.slice(i*valueSize, (i+1)*valueSize));
            const val2 = Array.from(track.values.slice((i+1)*valueSize, (i+2)*valueSize));
            track.values.set(val2, i*valueSize);
            track.values.set(val1, (i+1)*valueSize);
            swapped = true;

            // If we moved the selected key, we need to update its index
            if (selectedKeyframe?.keyIndex === i) {
              setSelectedKeyframe({trackName, keyIndex: i + 1});
            } else if (selectedKeyframe?.keyIndex === i + 1) {
              setSelectedKeyframe({trackName, keyIndex: i});
            }
          }
        }
      } while (swapped);
      
      setAnimationClip(newClip);
    }
  };

  const handleSaveAnimation = async () => {
    if (!animationClip || !vrmManager?.currentVrm) {
      alert('저장할 애니메이션 데이터가 없거나 VRM 모델이 로드되지 않았습니다.');
      return;
    }

    // =================================================================
    // DEBUGGING BLOCK
    console.log('[SAVE TRIGGERED] Dumping AnimationClip state before serialization:');
    console.log(animationClip);
    const hipsTrack = animationClip.tracks.find(t => t.name === 'Normalized_Hips.position');
    if (hipsTrack) {
      console.log('[HIPS POSITION TRACK DATA AT SAVE TIME]');
      console.log('  - Times:', hipsTrack.times);
      console.log('  - Values:', hipsTrack.values);
      const maxTime = hipsTrack.times.length > 0 ? Math.max(...hipsTrack.times) : -1;
      const minTime = hipsTrack.times.length > 0 ? Math.min(...hipsTrack.times) : -1;
      console.log('  - Max/Min Time:', maxTime, minTime);
      console.log('  - Is Finite:', isFinite(maxTime) && isFinite(minTime));
    } else {
      console.warn('[HIPS POSITION TRACK DATA AT SAVE TIME] - Track not found!');
    }
    // =================================================================

    try {
      setIsLoading(true);
      const arrayBuffer = await serializeVrma(animationClip, vrmManager.currentVrm);
      const result = await window.electronAPI.saveVrmaAnimation(arrayBuffer);
      if (result.success) {
        alert('성공적으로 저장되었습니다.');
      } else if (result.error) {
        alert(`저장 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to serialize or save animation:', error);
      alert(`애니메이션을 저장하는 중 오류 발생: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePanel = () => {
    // The cleanup effect will handle resetting the pose
    onClose();
  };

  const renderContent = () => {
    if (isLoading) {
      return <p className={styles.placeholder}>애니메이션 로딩 및 파싱 중...</p>;
    }
    if (error) {
      return <p className={styles.errorText}>{error}</p>;
    }
    if (animationClip) {
      return (
        <div className={styles.editorLayout}>
          <div className={styles.dopeSheetContainer}>
            <DopeSheetView
              animationClip={animationClip}
              currentTime={currentTime}
              onTimeChange={handleTimeChange}
              selectedKeyframe={selectedKeyframe}
              onKeyframeSelect={handleKeyframeSelect}
            />
          </div>
          <div className={styles.keyframeEditorContainer}>
            <KeyframeEditor 
              animationClip={animationClip}
              selectedKeyframe={selectedKeyframe}
              onKeyframeUpdate={handleKeyframeUpdate}
            />
          </div>
        </div>
      );
    }
    return <p className={styles.placeholder}>데이터가 없습니다.</p>;
  };

  return (
    <Panel title={`에디터: ${animationName}`} onClose={handleClosePanel} initialPos={initialPos} onDragEnd={onDragEnd} width="90vw" height="600px">
      <div className={styles.container}>
        <div className={styles.content}>
          {renderContent()}
        </div>
        <div className={styles.footer}>
            <PlaybackControls 
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onPause={handlePause}
              onGoToStart={handleGoToStart}
            />
            <div className={styles.buttonGroup}>
              <button onClick={handleSaveAnimation} className={styles.actionButton}>
                저장
              </button>
              <button onClick={handleClosePanel} className={styles.backButton}>
                &larr; 목록으로 돌아가기
              </button>
            </div>
        </div>
      </div>
    </Panel>
  );
};

export default AnimationEditPanel;