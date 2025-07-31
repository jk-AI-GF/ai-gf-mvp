import React, { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';
import eventBus from '../../core/event-bus';
import { useAppContext } from '../contexts/AppContext';

interface SidebarProps {
  isUiInteractive: boolean;
  onOpenPluginsPanel: () => void;
  onOpenModManagementPanel: () => void;
  onOpenSettings: () => void;
  onOpenMaterialPanel: () => void;
  onOpenLightPanel: () => void;
  onOpenCreatorPanel: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isUiInteractive,
  onOpenPluginsPanel,
  onOpenModManagementPanel,
  onOpenSettings,
  onOpenMaterialPanel,
  onOpenLightPanel,
  onOpenCreatorPanel,
}) => {
  const { pluginManager } = useAppContext();
  const [isEditMode, setIsEditMode] = useState(false);

  const handleToggleEditMode = () => {
    const newMode = !isEditMode;
    setIsEditMode(newMode);
    eventBus.emit('ui:editModeToggled', { isEditMode: newMode });
  };

  const handleToggleMouseIgnore = () => {
    pluginManager?.context.system.toggleMouseIgnore();
  };

  const handleQuit = () => {
    window.electronAPI.quitApp();
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <button
          className={`${styles.menuButton} ${isEditMode ? styles.active : ''}`}
          onClick={handleToggleEditMode}
        >
          {isEditMode ? '편집 모드 ON' : '편집 모드 OFF'}
        </button>
        <button
          className={`${styles.menuButton} ${!isUiInteractive ? styles.active : ''}`}
          onClick={handleToggleMouseIgnore}
        >
          {!isUiInteractive ? '마우스 무시중' : '마우스 무시'}
        </button>
        <button className={styles.menuButton} onClick={onOpenSettings}>설정</button>
        <button className={styles.menuButton} onClick={onOpenMaterialPanel}>재질</button>
        <button className={styles.menuButton} onClick={onOpenLightPanel}>조명</button>
        <button className={styles.menuButton} onClick={onOpenCreatorPanel}>크리에이터</button>
        <button className={styles.menuButton} onClick={onOpenPluginsPanel}>플러그인</button>
        <button className={styles.menuButton} onClick={onOpenModManagementPanel}>모드 관리</button>
        <button className={`${styles.menuButton} ${styles.quitButton}`} onClick={handleQuit}>종료</button>
      </div>
    </div>
  );
};

export default Sidebar;
