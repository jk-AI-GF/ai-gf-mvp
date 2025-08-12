import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Panel from '../Panel';
import styles from './AnimationEditPanel.module.css';
import { parseVrma } from './vrma-parser';
import DopeSheetView from './DopeSheetView';
import PlaybackControls from './PlaybackControls';

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
  const [animationClip, setAnimationClip] = useState<THREE.AnimationClip | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const animationFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

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

        const result = await window.electronAPI.readAbsoluteFile(filePath);
        if (!(result instanceof ArrayBuffer)) {
          throw new Error('파일을 ArrayBuffer 형식으로 읽지 못했습니다.');
        }

        const clip = await parseVrma(result, animationName);
        setAnimationClip(clip);
        console.log('Parsed AnimationClip:', clip);

      } catch (err) {
        console.error('Failed to load and parse animation:', err);
        setError(err.message || '애니메이션을 로드하고 파싱하는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAndParseAnimation();
  }, [animationName]);

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
            />
          </div>
          <div className={styles.keyframeEditorContainer}>
            {/* KeyframeEditor will go here */}
            <div className={styles.placeholder}>키프레임 상세 편집기 영역</div>
          </div>
        </div>
      );
    }
    return <p className={styles.placeholder}>데이터가 없습니다.</p>;
  };

  return (
    <Panel title={`에디터: ${animationName}`} onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd} width="90vw" height="600px">
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
            <button onClick={onClose} className={styles.backButton}>
            &larr; 목록으로 돌아가기
            </button>
        </div>
      </div>
    </Panel>
  );
};

export default AnimationEditPanel;
