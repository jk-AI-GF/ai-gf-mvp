import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
}

const AssetPanel: React.FC<AssetPanelProps> = ({
  onClose,
  initialTab = 'vrm',
  initialPos,
  onDragEnd,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AssetTabType>(initialTab);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'vrm':
        return <VRMPanel />;
      case 'animation':
        return <AnimationPanel />;
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
    <Panel title={t('assetPanel.title')} onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd} width="350px" height="500px">
      <div className={styles.container}>
        <div className={styles.tabBar}>
          <button onClick={() => setActiveTab('vrm')} className={activeTab === 'vrm' ? styles.activeTab : ''}>{t('assetPanel.tabVrm')}</button>
          <button onClick={() => setActiveTab('animation')} className={activeTab === 'animation' ? styles.activeTab : ''}>{t('assetPanel.tabAnimation')}</button>
          <button onClick={() => setActiveTab('pose')} className={activeTab === 'pose' ? styles.activeTab : ''}>{t('assetPanel.tabPose')}</button>
          <button onClick={() => setActiveTab('joint')} className={activeTab === 'joint' ? styles.activeTab : ''}>{t('assetPanel.tabJoint')}</button>
          <button onClick={() => setActiveTab('expression')} className={activeTab === 'expression' ? styles.activeTab : ''}>{t('assetPanel.tabExpression')}</button>
        </div>
        <div className={styles.tabContent}>
          {renderTabContent()}
        </div>
      </div>
    </Panel>
  );
};

export default AssetPanel;
