import React from 'react';
import Panel from './Panel';
import styles from './AnimationEditPanel.module.css';

interface AnimationEditPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
  animationName: string | null;
}

const AnimationEditPanel: React.FC<AnimationEditPanelProps> = ({ 
  onClose, 
  initialPos, 
  onDragEnd, 
  animationName 
}) => {
  if (!animationName) return null;

  return (
    <Panel title="애니메이션 편집" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.container}>
        <div className={styles.content}>
          <p className={styles.info}>
            현재 편집 중인 파일: <strong>{animationName}</strong>
          </p>
          <p className={styles.placeholder}>
            애니메이션 편집 기능이 여기에 구현될 예정입니다.
          </p>
        </div>
        <button onClick={onClose} className={styles.backButton}>
          &larr; 목록으로 돌아가기
        </button>
      </div>
    </Panel>
  );
};

export default AnimationEditPanel;
