
import React, { useState, useEffect, useCallback } from 'react';
import Panel from './Panel';
import styles from './PosePanel.module.css';

interface PosePanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const PosePanel: React.FC<PosePanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const [poseFiles, setPoseFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPoses = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI.listDirectory('Pose');
      if (result.error) {
        throw new Error(result.error);
      }
      const vrmaFiles = result.files.filter((file: string) => file.endsWith('.vrma'));
      setPoseFiles(vrmaFiles);
      if (vrmaFiles.length === 0) {
        setError('저장된 포즈 파일(.vrma)이 없습니다.');
      }
    } catch (err) {
      console.error('Failed to list poses:', err);
      setError('포즈 목록을 불러오는 데 실패했습니다.');
    }
  }, []);

  useEffect(() => {
    fetchPoses();
  }, [fetchPoses]);

  const handlePoseClick = async (fileName: string) => {
    if (window.vrmManager) {
      const result = await window.vrmManager.loadAndParseFile(`Pose/${fileName}`);
      if (result?.type === 'pose') {
        window.vrmManager.applyPose(result.data);
      } else {
        setError(`'${fileName}'은 포즈 파일이 아닙니다.`);
      }
    } else {
      console.error('vrmManager is not available.');
      setError('VRM 매니저를 찾을 수 없습니다.');
    }
  };

  return (
    <Panel title="포즈 선택" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.content}>
        {error && <p className={styles.emptyMessage}>{error}</p>}
        {poseFiles.map((file) => (
          <button
            key={file}
            onClick={() => handlePoseClick(file)}
            className={styles.listButton}
          >
            {file}
          </button>
        ))}
      </div>
    </Panel>
  );
};

export default PosePanel;
