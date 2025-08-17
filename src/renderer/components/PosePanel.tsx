
import React, { useState, useEffect } from 'react';
import styles from './PosePanel.module.css';
import { useAppContext } from '../contexts/AppContext';

const PosePanel: React.FC = () => {
  const { pluginManager } = useAppContext();
  const [poseFiles, setPoseFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPoses = async () => {
      setError(null);
      try {
        const vrmaFiles = await window.electronAPI.listAssets('pose');
        setPoseFiles(vrmaFiles);

        if (vrmaFiles.length === 0) {
          setError('저장된 포즈 파일(.vrma)이 없습니다.');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        console.error('Failed to list poses:', err);
        setError(errorMessage);
      }
    };

    fetchPoses();
  }, []);

  const handlePoseClick = (fileName: string) => {
    pluginManager?.context.actions.setPose(fileName);
  };

  const handleSavePose = () => {
    pluginManager?.context.actions.saveCurrentPose();
  };

  const handleOpenExplorer = () => {
    window.electronAPI.invoke('resource:open-in-explorer', 'pose');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button className={styles.actionButton} onClick={handleSavePose}>
          Save Current Pose
        </button>
        <button className={styles.actionButton} onClick={handleOpenExplorer}>
          파일매니저에서 열기
        </button>
      </div>
      <div className={styles.list}>
        {error && <p className={styles.emptyMessage}>{error}</p>}
        {poseFiles.map((file) => (
          <button
            key={file}
            onClick={() => handlePoseClick(file)}
            className={styles.listButton}
          >
            {file}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PosePanel;
