import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { contextStore } = useAppContext();
  const { t } = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);

  const handleToggleEditMode = () => {
    const newMode = !isEditMode;
    setIsEditMode(newMode);
    contextStore.set('isEditMode', newMode);
    eventBus.emit('ui:editModeToggled', { isEditMode: newMode });
  };

  const handleToggleMouseIgnore = () => {
    window.electronAPI.requestToggleMouseIgnore();
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
          {isEditMode ? t('sidebar.editModeOn') : t('sidebar.editModeOff')}
        </button>
        <button
          className={`${styles.menuButton} ${!isUiInteractive ? styles.active : ''}`}
          onClick={handleToggleMouseIgnore}
        >
          {!isUiInteractive ? t('sidebar.mouseIgnoreOn') : t('sidebar.mouseIgnoreOff')}
        </button>
        <button className={styles.menuButton} onClick={onOpenSettings}>{t('sidebar.settings')}</button>
        <button className={styles.menuButton} onClick={onOpenMaterialPanel}>{t('sidebar.materials')}</button>
        <button className={styles.menuButton} onClick={onOpenLightPanel}>{t('sidebar.lighting')}</button>
        <button className={styles.menuButton} onClick={onOpenCreatorPanel}>{t('sidebar.creator')}</button>
        <button className={styles.menuButton} onClick={onOpenPluginsPanel}>{t('sidebar.plugins')}</button>
        <button className={styles.menuButton} onClick={onOpenModManagementPanel}>{t('sidebar.modManagement')}</button>
        <button className={`${styles.menuButton} ${styles.quitButton}`} onClick={handleQuit}>{t('sidebar.quit')}</button>
      </div>
    </div>
  );
};

export default Sidebar;
