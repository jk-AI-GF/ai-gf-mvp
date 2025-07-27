
import React from 'react';

interface TopMenuProps {
  onOpenPosePanel: () => void;
  onOpenAnimationPanel: () => void;
}

const TopMenu: React.FC<TopMenuProps> = ({ onOpenPosePanel, onOpenAnimationPanel }) => {
  const handleLoadVRM = async () => {
    const filePath = await window.electronAPI.openVrmFile();
    if (filePath) {
      window.vrmManager.loadVRM(filePath);
    }
  };

  const handleSavePose = () => {
    window.vrmManager.saveCurrentPose();
  };

  const handleLoadPose = async () => {
    const filePath = await window.electronAPI.openVrmaFile();
    if (filePath) {
        const result = await window.vrmManager.loadAndParseFile(filePath);
        if (result?.type === 'pose') {
            window.vrmManager.applyPose(result.data);
        } else {
            alert('선택한 파일은 포즈 파일이 아닙니다.');
        }
    }
  };

  const handleQuit = () => {
    (window as any).electronAPI.quitApp();
  };

  return (
    <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 1000, display: 'flex', gap: '10px' }}>
      <button onClick={handleLoadVRM}>VRM 모델 로드</button>
      <button onClick={onOpenPosePanel}>포즈 열기</button>
      <button onClick={onOpenAnimationPanel}>애니메이션 열기</button>
      <button onClick={handleSavePose}>포즈 저장</button>
      <button onClick={handleLoadPose}>포즈 파일 열기</button>
      <button onClick={handleQuit}>종료</button>
    </div>
  );
};

export default TopMenu;
