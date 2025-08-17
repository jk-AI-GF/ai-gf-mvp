
import React, { useState, useEffect } from 'react';
import styles from './AnimationPanel.module.css';
import { useAppContext } from '../contexts/AppContext';

interface AnimationPanelProps {
  onEdit: (fileName: string) => void;
}

const AnimationPanel: React.FC<AnimationPanelProps> = ({ onEdit }) => {
  const { pluginManager } = useAppContext();
  const [animationFiles, setAnimationFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnimations = async () => {
      setError(null);
      try {
        const animFiles = await window.electronAPI.listAssets('animation');
        setAnimationFiles(animFiles);

        if (animFiles.length === 0) {
          setError('저장된 애니메이션 파일(.vrma, .fbx)이 없습니다.');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        console.error('Failed to list animations:', err);
        setError(errorMessage);
      }
    };

    fetchAnimations();
  }, []);

  const handlePlayClick = (fileName: string) => {
    pluginManager?.context.actions.playAnimation(fileName, false);
  };

  const handleOpenExplorer = () => {
    window.electronAPI.invoke('resource:open-in-explorer', 'animation');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button className={styles.actionButton} onClick={handleOpenExplorer}>
          파일매니저에서 열기
        </button>
      </div>
      <div className={styles.list}>
        {error && <p className={styles.emptyMessage}>{error}</p>}
        {animationFiles.map((file) => (
          <div key={file} className={styles.animationItem}>
            <span className={styles.fileName} onClick={() => handlePlayClick(file)}>{file}</span>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => onEdit(file)}
                className={`${styles.listItemActionButton} ${styles.editButton}`}
              >
                편집
              </button>
              <button
                onClick={() => handlePlayClick(file)}
                className={`${styles.listItemActionButton} ${styles.playButton}`}
              >
                재생
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnimationPanel;
