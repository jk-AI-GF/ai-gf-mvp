import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import Panel from '../Panel';
import styles from './AnimationEditPanel.module.css';
import { parseVrma } from './vrma-parser';
import DopeSheetView from './DopeSheetView'; // 새로운 DopeSheetView를 임포트

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (!animationName) return null;

  const handleTimeChange = (newTime: number) => {
    setCurrentTime(newTime);
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
            {/* PlaybackControls will go here */}
            <button onClick={onClose} className={styles.backButton}>
            &larr; 목록으로 돌아가기
            </button>
        </div>
      </div>
    </Panel>
  );
};

export default AnimationEditPanel;
