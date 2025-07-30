import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import eventBus from '../../core/event-bus';
import styles from './EditMenu.module.css';

interface EditMenuProps {
  onOpenPosePanel: () => void;
  onOpenAnimationPanel: () => void;
  onOpenJointControl: () => void;
  onOpenExpressionPanel: () => void;
  onOpenMeshPanel: () => void;
}

const EditMenu: React.FC<EditMenuProps> = ({
  onOpenPosePanel,
  onOpenAnimationPanel,
  onOpenJointControl,
  onOpenExpressionPanel,
  onOpenMeshPanel,
}) => {
  const { vrmManager, pluginManager } = useAppContext();
  const [isVisible, setIsVisible] = useState(false);
  const [showHitboxes, setShowHitboxes] = useState(false);

  useEffect(() => {
    const handleEditModeToggle = (data: { isEditMode: boolean }) => {
      setIsVisible(data.isEditMode);
    };

    const unsubscribe = eventBus.on('ui:editModeToggled', handleEditModeToggle);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleHitboxes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setShowHitboxes(isChecked);
    if (pluginManager) {
      pluginManager.context.actions.setHitboxesVisible(isChecked);
    }
  };

  const handleLoadVRM = async () => {
    if (!vrmManager) return;
    const filePath = await window.electronAPI.openVrmFile();
    if (filePath) {
      vrmManager.loadVRM(filePath);
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
      await vrmManager.applyPoseFromFile(filePath);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.menuContainer}>
      <button className={styles.menuButton} onClick={handleLoadVRM}>VRM</button>
      <button className={styles.menuButton} onClick={onOpenJointControl}>관절</button>
      <button className={styles.menuButton} onClick={onOpenExpressionPanel}>표정</button>
      <button className={styles.menuButton} onClick={onOpenMeshPanel}>메쉬</button>
      <button className={styles.menuButton} onClick={onOpenPosePanel}>포즈</button>
      <button className={styles.menuButton} onClick={onOpenAnimationPanel}>애니</button>
      <button className={styles.menuButton} onClick={handleSavePose}>저장</button>
      <button className={styles.menuButton} onClick={handleLoadPose}>열기</button>
      
      <div className={styles.checkboxContainer}>
        <input
          type="checkbox"
          id="showHitboxes"
          checked={showHitboxes}
          onChange={handleToggleHitboxes}
        />
        <label htmlFor="showHitboxes" className={styles.checkboxLabel}>히트박스</label>
      </div>
    </div>
  );
};

export default EditMenu;


