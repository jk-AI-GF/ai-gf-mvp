import React from 'react';

interface SidebarProps {
  onOpenJointControl: () => void;
  onOpenExpressionPanel: () => void;
  onOpenPluginsPanel: () => void;
  onOpenMeshPanel: () => void;
  onOpenModManagementPanel: () => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onOpenJointControl,
  onOpenExpressionPanel,
  onOpenPluginsPanel,
  onOpenMeshPanel,
  onOpenModManagementPanel,
  onOpenSettings,
}) => {
  return (
    <div id="sidebar-container" style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 1000 }}>
      <div id="sidebar">
        <button className="menu-button" onClick={onOpenSettings}>설정</button>
        <button className="menu-button" onClick={onOpenJointControl}>관절 조절</button>
        <button className="menu-button" onClick={onOpenExpressionPanel}>표정</button>
        <button className="menu-button" onClick={onOpenPluginsPanel}>플러그인</button>
        <button className="menu-button" onClick={onOpenMeshPanel}>메쉬</button>
        <button className="menu-button" onClick={onOpenModManagementPanel}>모드 관리</button>
      </div>
    </div>
  );
};

export default Sidebar;
