
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AnimationPanel.module.css';
import { useAppContext } from '../contexts/AppContext';

const PosePanel: React.FC = () => {
  const { t } = useTranslation();
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
          setError(t('posePanel.noFiles'));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('animationPanel.unknownError');
        console.error('Failed to list poses:', err);
        setError(errorMessage);
      }
    };

    fetchPoses();
  }, [t]);

  const handlePoseClick = (fileName: string) => {
    pluginManager?.context.actions['character.setPose'](fileName);
  };

  const handleSavePose = () => {
    pluginManager?.context.actions['character.saveCurrentPose']();
  };

  const handleOpenExplorer = () => {
    window.electronAPI.invoke('resource:open-in-explorer', 'pose');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button className={styles.actionButton} onClick={handleSavePose}>
          {t('posePanel.saveCurrentPose')}
        </button>
        <button className={styles.actionButton} onClick={handleOpenExplorer}>
          {t('animationPanel.openInExplorer')}
        </button>
      </div>
      <div className={styles.list}>
        {error && <p className={styles.emptyMessage}>{error}</p>}
        {poseFiles.map((file) => (
          <div key={file} className={styles.animationItem}>
            <span className={styles.fileName} onClick={() => handlePoseClick(file)}>{file}</span>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => handlePoseClick(file)}
                className={`${styles.listItemActionButton} ${styles.playButton}`}
              >
                {t('animationPanel.play')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PosePanel;
