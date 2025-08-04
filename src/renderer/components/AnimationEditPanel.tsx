import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import Panel from './Panel';
import styles from './AnimationEditPanel.module.css';
import { parseVrma } from '../vrma-parser';

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
        // Find file path
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

        // Read file as ArrayBuffer
        const result = await window.electronAPI.readAbsoluteFile(filePath);
        if (!(result instanceof ArrayBuffer)) {
          throw new Error('파일을 ArrayBuffer 형식으로 읽지 못했습니다.');
        }

        // Parse using the new parser utility
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

  const renderContent = () => {
    if (isLoading) {
      return <p className={styles.placeholder}>애니메이션 로딩 및 파싱 중...</p>;
    }
    if (error) {
      return <p className={styles.errorText}>{error}</p>;
    }
    if (animationClip) {
      return (
        <>
          <p className={styles.info}>
            <strong>{animationClip.name}</strong> 클립 로드 완료.
          </p>
          <div className={styles.clipDetails}>
            <span>재생 시간: {animationClip.duration.toFixed(2)}초</span>
            <span>트랙 수: {animationClip.tracks.length}개</span>
          </div>
          <p className={styles.placeholder}>
            다음 단계: 타임라인 및 키프레임 편집 UI 구현
          </p>
        </>
      );
    }
    return <p className={styles.placeholder}>데이터가 없습니다.</p>;
  };

  return (
    <Panel title="애니메이션 편집" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.container}>
        <div className={styles.content}>
          {renderContent()}
        </div>
        <button onClick={onClose} className={styles.backButton}>
          &larr; 목록으로 돌아가기
        </button>
      </div>
    </Panel>
  );
};

export default AnimationEditPanel;
