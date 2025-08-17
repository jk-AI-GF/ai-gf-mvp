import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import styles from './VRMPanel.module.css';
import { VRMMeta } from '@pixiv/three-vrm';
import VRMPreviewDialog from './VRMPreviewDialog';

const VRMPanel: React.FC = () => {
  const { vrmManager } = useAppContext();
  const [vrmFiles, setVrmFiles] = useState<string[]>([]);
  const [vrmPreview, setVrmPreview] = useState<{ path: string; meta: VRMMeta } | null>(null);

  useEffect(() => {
    const fetchVRMFiles = async () => {
      const files = await window.electronAPI.listAssets('vrm');
      if (files) {
        setVrmFiles(files);
      }
    };
    fetchVRMFiles();
  }, []);

  const handleFileSelect = async (fileName: string) => {
    if (!vrmManager) return;
    // Let vrmManager handle path resolution
    const absolutePath = await window.electronAPI.invoke<string | null>('resource:resolve-path', 'vrm', fileName);
    if (absolutePath) {
        const meta = await vrmManager.readVRMMeta(absolutePath);
        if (meta) {
            setVrmPreview({ path: fileName, meta }); // Pass fileName, not absolutePath
        } else {
            alert('Failed to read VRM metadata.');
        }
    }
  };

  const handleConfirmLoad = (fileName: string) => {
    if (vrmManager) {
      vrmManager.loadVRM(fileName);
    }
    setVrmPreview(null);
  };

  const handleCancelLoad = () => {
    setVrmPreview(null);
  };

  const handleOpenExplorer = () => {
    window.electronAPI.invoke('resource:open-in-explorer', 'vrm');
  };

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.header}>
          <button className={styles.actionButton} onClick={handleOpenExplorer}>
            파일매니저에서 열기
          </button>
        </div>
        <div className={styles.list}>
          {vrmFiles.map((file) => (
            <div
              key={file}
              className={styles.listItem}
              onClick={() => handleFileSelect(file)}
            >
              {file}
            </div>
          ))}
        </div>
      </div>
      {vrmPreview && (
        <VRMPreviewDialog
          meta={vrmPreview.meta}
          filePath={vrmPreview.path}
          onConfirm={handleConfirmLoad}
          onCancel={handleCancelLoad}
        />
      )}
    </>
  );
};

export default VRMPanel;
