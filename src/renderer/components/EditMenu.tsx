import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import eventBus from '../../core/event-bus';
import styles from './EditMenu.module.css';

interface EditMenuProps {
  onOpenPosePanel: () => void;
  onOpenAnimationPanel: () => void;
}

const EditMenu: React.FC<EditMenuProps> = ({ onOpenPosePanel, onOpenAnimationPanel }) => {
  const { vrmManager } = useAppContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleEditModeToggle = (data: { isEditMode: boolean }) => {
      setIsVisible(data.isEditMode);
    };

    const unsubscribe = eventBus.on('ui:editModeToggled', handleEditModeToggle);

    return () => {
      unsubscribe();
    };
  }, []);

  const getRelativePath = (fullPath: string): string | null => {
    const assetsDir = 'assets';
    const pathSeparator = /[\\/]/;
    const parts = fullPath.split(pathSeparator);
    const assetsIndex = parts.lastIndexOf(assetsDir);
    
    if (assetsIndex !== -1) {
      return parts.slice(assetsIndex + 1).join('/');
    }
    
    alert(`파일은 프로젝트 'assets' 폴더 내에 있어야 합니다.`);
    return null;
  };

  const handleLoadVRM = async () => {
    if (!vrmManager) return;
    const filePath = await window.electronAPI.openVrmFile();
    if (filePath) {
      const relativePath = getRelativePath(filePath);
      if (relativePath) {
        vrmManager.loadVRM(relativePath);
      }
    }
  };

  const handleSavePose = () => {
    if (!vrmManager) return;
    vrmManager.saveCurrentPose();
  };

  const handleLoadPose = async () => {
    if (!vrmManager) return;
    const filePath = await window.electronAPI.openVrmaFile();
    if (filePath) {
        const relativePath = getRelativePath(filePath);
        if (relativePath) {
            const result = await vrmManager.loadAndParseFile(relativePath);
            if (result?.type === 'pose') {
                vrmManager.applyPose(result.data);
            } else {
                alert('선택한 파일은 포즈 파일이 아닙니다.');
            }
        }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.menuContainer}>
      <button className={styles.menuButton} onClick={handleLoadVRM}>VRM</button>
      <button className={styles.menuButton} onClick={onOpenPosePanel}>포즈</button>
      <button className={styles.menuButton} onClick={onOpenAnimationPanel}>애니</button>
      <button className={styles.menuButton} onClick={handleSavePose}>저장</button>
      <button className={styles.menuButton} onClick={handleLoadPose}>열기</button>
    </div>
  );
};

export default EditMenu;