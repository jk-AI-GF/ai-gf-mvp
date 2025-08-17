
import React, { useState, useEffect, useCallback } from 'react';
import Panel from './Panel';
import styles from './PosePanel.module.css';
import { useAppContext } from '../contexts/AppContext';

interface PosePanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const PosePanel: React.FC<PosePanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const { pluginManager } = useAppContext(); // vrmManager에서 pluginManager로 변경
  const [poseFiles, setPoseFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPoses = async () => {
      setError(null);
      try {
        const vrmaFiles = await window.electronAPI.listAssets('pose');
        setPoseFiles(vrmaFiles);

        if (vrmaFiles.length === 0) {
          setError('저장된 포즈 파일(.vrma)이 없습니다.');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        console.error('Failed to list poses:', err);
        setError(errorMessage);
      }
    };

    fetchPoses();
  }, []);

  const handlePoseClick = (fileName: string) => {
    if (pluginManager) {
      // 표준 Actions 인터페이스를 통해 포즈 설정
      pluginManager.context.actions.setPose(fileName);
    } else {
      console.error('pluginManager is not available.');
      setError('플러그인 매니저를 찾을 수 없습니다.');
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
