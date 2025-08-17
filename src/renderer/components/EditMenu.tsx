import React, { useState, useEffect } from 'react';
import eventBus from '../../core/event-bus';
import styles from './EditMenu.module.css';
import VrmScaleSlider from './VrmScaleSlider';
import { useAppContext } from '../contexts/AppContext';
import { AssetTabType } from './AssetPanel';

interface EditMenuProps {
  onOpenAssetPanel: (tab: AssetTabType) => void;
  onOpenMeshControlPanel: () => void;
}

const EditMenu: React.FC<EditMenuProps> = ({ onOpenAssetPanel, onOpenMeshControlPanel }) => {
  const { pluginManager } = useAppContext();
  const [isVisible, setIsVisible] = useState(false);
  const [showHitboxes, setShowHitboxes] = useState(false);

  useEffect(() => {
    const handleEditModeToggle = (data: { isEditMode: boolean }) => {
      setIsVisible(data.isEditMode);
    };
    const unsubscribe = eventBus.on('ui:editModeToggled', handleEditModeToggle);
    return () => unsubscribe();
  }, []);

  const handleToggleHitboxes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setShowHitboxes(isChecked);
    pluginManager?.context.actions.setHitboxesVisible(isChecked);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.menuContainer}>
      <button className={styles.menuButton} onClick={() => onOpenAssetPanel('vrm')}>VRM</button>
      <button className={styles.menuButton} onClick={() => onOpenAssetPanel('joint')}>관절</button>
      <button className={styles.menuButton} onClick={() => onOpenAssetPanel('expression')}>표정</button>
      <button className={styles.menuButton} onClick={() => onOpenAssetPanel('pose')}>포즈</button>
      <button className={styles.menuButton} onClick={() => onOpenAssetPanel('animation')}>애니</button>
      <button className={styles.menuButton} onClick={onOpenMeshControlPanel}>메쉬</button>
      
      <div className={styles.checkboxContainer}>
        <input
          type="checkbox"
          id="showHitboxes"
          checked={showHitboxes}
          onChange={handleToggleHitboxes}
        />
        <label htmlFor="showHitboxes" className={styles.checkboxLabel}>히트박스</label>
      </div>
      <VrmScaleSlider />
    </div>
  );
};

export default EditMenu;


