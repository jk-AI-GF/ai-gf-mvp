import React, { useState } from 'react';
import Panel from './Panel';
import styles from './AssetPanel.module.css';
import VRMPanel from './VRMPanel';
import AnimationPanel from './AnimationPanel';
import PosePanel from './PosePanel';
import JointControlPanel from './JointControlPanel';
import ExpressionPanel from './ExpressionPanel';

export type AssetTabType = 'vrm' | 'animation' | 'pose' | 'joint' | 'expression';

interface AssetPanelProps {
  onClose: () => void;
  initialTab?: AssetTabType;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
  onEditAnimation: (animationName: string) => void;
}

const AssetPanel: React.FC<AssetPanelProps> = ({ 
  onClose, 
  initialTab = 'vrm',
  initialPos, 
  onDragEnd,
  onEditAnimation,
}) => {
  const [activeTab, setActiveTab] = useState<AssetTabType>(initialTab);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'vrm':
        return <VRMPanel />;
      case 'animation':
        return <AnimationPanel onEdit={onEditAnimation} />;
      case 'pose':
        return <PosePanel />;
      case 'joint':
        return <JointControlPanel />;
      case 'expression':
        return <ExpressionPanel />;
      default:
        return null;
    }
  };

  return (
    <Panel title="Asset Panel" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd} width="350px" height="500px">
      <div className={styles.container}>
        <div className={styles.tabBar}>
          <button onClick={() => setActiveTab('vrm')} className={activeTab === 'vrm' ? styles.activeTab : ''}>VRM</button>
          <button onClick={() => setActiveTab('animation')} className={activeTab === 'animation' ? styles.activeTab : ''}>Animation</button>
          <button onClick={() => setActiveTab('pose')} className={activeTab === 'pose' ? styles.activeTab : ''}>Pose</button>
          <button onClick={() => setActiveTab('joint')} className={activeTab === 'joint' ? styles.activeTab : ''}>Joint</button>
          <button onClick={() => setActiveTab('expression')} className={activeTab === 'expression' ? styles.activeTab : ''}>Expression</button>
        </div>
        <div className={styles.tabContent}>
          {renderTabContent()}
        </div>
      </div>
    </Panel>
  );
};

export default AssetPanel;
