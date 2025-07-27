import React, { useState } from 'react';
import SettingsModal from './components/SettingsModal';
import JointControlPanel from './components/JointControlPanel';
import ExpressionPanel from './components/ExpressionPanel';
import Sidebar from './components/Sidebar';
import PluginPanel from './components/PluginPanel';

const App: React.FC = () => {
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  // Add state for other panels, initially all closed
  const [isJointPanelOpen, setJointPanelOpen] = useState(false);
  const [isExpressionPanelOpen, setExpressionPanelOpen] = useState(false);
  const [isPluginsPanelOpen, setPluginsPanelOpen] = useState(false);
  const [isMeshPanelOpen, setMeshPanelOpen] = useState(false);
  const [isModManagementPanelOpen, setModManagementPanelOpen] = useState(false);

  return (
    <div>
      <Sidebar
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenJointControl={() => setJointPanelOpen(true)}
        onOpenExpressionPanel={() => setExpressionPanelOpen(true)}
        onOpenPluginsPanel={() => setPluginsPanelOpen(true)}
        onOpenMeshPanel={() => setMeshPanelOpen(true)}
        onOpenModManagementPanel={() => setModManagementPanelOpen(true)}
      />

      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)} 
      />

      {/* Placeholder for other panels */}
      {isJointPanelOpen && <JointControlPanel onClose={() => setJointPanelOpen(false)} />}
      import ExpressionPanel from './components/ExpressionPanel';
      {isExpressionPanelOpen && <ExpressionPanel onClose={() => setExpressionPanelOpen(false)} />}
      {isPluginsPanelOpen && <PluginPanel onClose={() => setPluginsPanelOpen(false)} />}
      {isMeshPanelOpen && <div className="panel">Mesh Panel (React)</div>}
      {isModManagementPanelOpen && <div className="panel">Mod Management Panel (React)</div>}
    </div>
  );
};

export default App;
