
import React from 'react';
import { useAppContext } from '../contexts/AppContext';

interface TopMenuProps {
  onOpenPosePanel: () => void;
  onOpenAnimationPanel: () => void;
}

const TopMenu: React.FC<TopMenuProps> = ({ onOpenPosePanel, onOpenAnimationPanel }) => {
  const { vrmManager } = useAppContext();

  const getRelativePath = (fullPath: string): string | null => {
    const assetsDir = 'assets';
    const pathSeparator = /[\\/]/;
    const parts = fullPath.split(pathSeparator);
    const assetsIndex = parts.lastIndexOf(assetsDir);
    
    if (assetsIndex !== -1) {
      return parts.slice(assetsIndex + 1).join('/');
    }
    
    alert(`파일은 프로젝트 'assets' 폴더 내에 있어야 합니다.`);
    return null;
  };

  const handleLoadVRM = async () => {
    if (!vrmManager) return;
    const filePath = await window.electronAPI.openVrmFile();
    if (filePath) {
      const relativePath = getRelativePath(filePath);
      if (relativePath) {
        vrmManager.loadVRM(relativePath);
      }
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
        const relativePath = getRelativePath(filePath);
        if (relativePath) {
            const result = await vrmManager.loadAndParseFile(relativePath);
            if (result?.type === 'pose') {
                vrmManager.applyPose(result.data);
            } else {
                alert('선택한 파일은 포즈 파일이 아닙니다.');
            }
        }
    }
  };

  const handleQuit = () => {
    window.electronAPI.quitApp();
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
