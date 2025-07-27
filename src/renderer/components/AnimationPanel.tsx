
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
  const { pluginManager } = useAppContext(); // vrmManager에서 pluginManager로 변경
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

  const handleAnimationClick = (fileName: string) => {
    if (pluginManager) {
      // 표준 Actions 인터페이스를 통해 애니메이션 재생
      pluginManager.context.actions.playAnimation(`Animation/${fileName}`, false);
    } else {
      console.error('pluginManager is not available.');
      setError('플러그인 매니저를 찾을 수 없습니다.');
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
