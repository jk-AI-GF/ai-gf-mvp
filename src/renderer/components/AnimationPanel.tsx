
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AnimationPanel.module.css';
import { useAppContext } from '../contexts/AppContext';

interface AnimationPanelProps {}

const AnimationPanel: React.FC<AnimationPanelProps> = () => {
  const { t } = useTranslation();
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
          setError(t('animationPanel.noFiles'));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('animationPanel.unknownError');
        console.error('Failed to list animations:', err);
        setError(errorMessage);
      }
    };

    fetchAnimations();
  }, [t]);

  const handlePlayClick = (fileName: string) => {
    pluginManager?.context.actions['character.playAnimation'](fileName, false);
  };

  const handleOpenExplorer = () => {
    window.electronAPI.invoke('resource:open-in-explorer', 'animation');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button className={styles.actionButton} onClick={handleOpenExplorer}>
          {t('animationPanel.openInExplorer')}
        </button>
      </div>
      <div className={styles.list}>
        {error && <p className={styles.emptyMessage}>{error}</p>}
        {animationFiles.map((file) => (
          <div key={file} className={styles.animationItem}>
            <span className={styles.fileName} onClick={() => handlePlayClick(file)}>{file}</span>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => handlePlayClick(file)}
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

export default AnimationPanel;
