
import React, { useState, useEffect, useCallback } from 'react';
import Panel from './Panel';
import styles from './AnimationPanel.module.css';
import { useAppContext } from '../contexts/AppContext';

interface AnimationPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
  onEdit: (fileName: string) => void;
}

const AnimationPanel: React.FC<AnimationPanelProps> = ({ onClose, initialPos, onDragEnd, onEdit }) => {
  const { pluginManager } = useAppContext(); // vrmManager에서 pluginManager로 변경
  const [animationFiles, setAnimationFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnimations = async () => {
      setError(null);
      try {
        // Fetch from both userdata and assets
        const [userResult, assetsResult] = await Promise.all([
          window.electronAPI.listDirectory('animations', 'userData'),
          window.electronAPI.listDirectory('Animation', 'assets')
        ]);

        if (userResult.error || assetsResult.error) {
          const errorMessage = userResult.error || assetsResult.error;
          console.error('Error fetching animations:', errorMessage);
          throw new Error('애니메이션 폴더를 읽는 중 오류가 발생했습니다.');
        }

        // Combine and deduplicate file lists
        const combinedFiles = new Set([...(userResult.files || []), ...(assetsResult.files || [])]);
        const animFiles = Array.from(combinedFiles).filter((file: string) => 
          file.toLowerCase().endsWith('.vrma') || file.toLowerCase().endsWith('.fbx')
        );
        
        setAnimationFiles(animFiles);

        if (animFiles.length === 0) {
          setError('저장된 애니메이션 파일(.vrma, .fbx)이 없습니다.');
        }
      } catch (err) {
        console.error('Failed to list animations:', err);
        setError(err.message || '알 수 없는 오류가 발생했습니다.');
      }
    };

    fetchAnimations();
  }, []);

  const handlePlayClick = (fileName: string) => {
    if (pluginManager) {
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
          <div key={file} className={styles.animationItem}>
            <span className={styles.fileName}>{file}</span>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => onEdit(file)}
                className={`${styles.actionButton} ${styles.editButton}`}
              >
                편집
              </button>
              <button
                onClick={() => handlePlayClick(file)}
                className={`${styles.actionButton} ${styles.playButton}`}
              >
                재생
              </button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};

export default AnimationPanel;
