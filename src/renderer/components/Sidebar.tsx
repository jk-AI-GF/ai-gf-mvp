import React from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onOpenJointControl: () => void;
  onOpenExpressionPanel: () => void;
  onOpenPluginsPanel: () => void;
  onOpenMeshPanel: () => void;
  onOpenModManagementPanel: () => void;
  onOpenSettings: () => void;
  onOpenMaterialPanel: () => void;
  onOpenLightPanel: () => void; // Add prop for LightPanel
}

const Sidebar: React.FC<SidebarProps> = ({
  onOpenJointControl,
  onOpenExpressionPanel,
  onOpenPluginsPanel,
  onOpenMeshPanel,
  onOpenModManagementPanel,
  onOpenSettings,
  onOpenMaterialPanel,
  onOpenLightPanel, // Destructure prop
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <button className={styles.menuButton} onClick={onOpenSettings}>설정</button>
        <button className={styles.menuButton} onClick={onOpenJointControl}>관절 조절</button>
        <button className={styles.menuButton} onClick={onOpenExpressionPanel}>표정</button>
        <button className={styles.menuButton} onClick={onOpenMaterialPanel}>재질</button>
        <button className={styles.menuButton} onClick={onOpenLightPanel}>조명</button>
        <button className={styles.menuButton} onClick={onOpenPluginsPanel}>플러그인</button>
        <button className={styles.menuButton} onClick={onOpenMeshPanel}>메쉬</button>
        <button className={styles.menuButton} onClick={onOpenModManagementPanel}>모드 관리</button>
      </div>
    </div>
  );
};

export default Sidebar;
