
import React, { useState, useEffect, useCallback } from 'react';
import Panel from './Panel';
import styles from './AnimationPanel.module.css';
import { useAppContext } from '../contexts/AppContext';

interface AnimationPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const AnimationPanel: React.FC<AnimationPanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const { vrmManager } = useAppContext();
  const [animationFiles, setAnimationFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAnimations = useCallback(async () => {
    try {
      const result = await window.electronAPI.listDirectory('Animation');
      if (result.error) {
        throw new Error(result.error);
      }
      const animFiles = result.files.filter((file: string) => file.endsWith('.vrma') || file.endsWith('.fbx'));
      setAnimationFiles(animFiles);
      if (animFiles.length === 0) {
        setError('저장된 애니메이션 파일(.vrma, .fbx)이 없습니다.');
      }
    } catch (err) {
      console.error('Failed to list animations:', err);
      setError('애니메이션 목록을 불러오는 데 실패했습니다.');
    }
  }, []);

  useEffect(() => {
    fetchAnimations();
  }, [fetchAnimations]);

  const handleAnimationClick = async (fileName: string) => {
    if (vrmManager) {
      // Reset to T-Pose before playing a new animation to clear any existing pose.
      vrmManager.resetToTPose();
      
      const result = await vrmManager.loadAndParseFile(`Animation/${fileName}`);
      if (result?.type === 'animation') {
        vrmManager.playAnimation(result.data, false);
      } else {
        setError(`'${fileName}'은 애니메이션 파일이 아닙니다.`);
      }
    } else {
      console.error('vrmManager is not available.');
      setError('VRM 매니저를 찾을 수 없습니다.');
    }
  };

  return (
    <Panel title="애니메이션 선택" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.content}>
        {error && <p className={styles.emptyMessage}>{error}</p>}
        {animationFiles.map((file) => (
          <button
            key={file}
            onClick={() => handleAnimationClick(file)}
            className={styles.listButton}
          >
            {file}
          </button>
        ))}
      </div>
    </Panel>
  );
};

export default AnimationPanel;
