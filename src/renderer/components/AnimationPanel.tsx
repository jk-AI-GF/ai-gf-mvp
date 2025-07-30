
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
    setError(null);
    try {
      // Fetch from both userdata and assets
      const [userResult, assetsResult] = await Promise.all([
        window.electronAPI.listDirectory('animations', 'userData'),
        window.electronAPI.listDirectory('Animation', 'assets')
      ]);

      if (userResult.error || assetsResult.error) {
        console.error('Error fetching animations:', userResult.error || assetsResult.error);
        throw new Error('애니메이션 폴더 중 하나를 읽는 데 실패했습니다.');
      }

      // Combine and deduplicate file lists
      const combinedFiles = new Set([...userResult.files, ...assetsResult.files]);
      const animFiles = Array.from(combinedFiles).filter((file: string) => file.endsWith('.vrma') || file.endsWith('.fbx'));
      
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
      // 파일 이름만 전달하도록 수정. vrm-manager가 경로를 처리함.
      pluginManager.context.actions.playAnimation(fileName, false);
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
