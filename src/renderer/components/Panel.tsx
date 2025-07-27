import React, { useState, useRef } from 'react';
import { useDraggable } from '../hooks/useDraggable';
import styles from './Panel.module.css';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const Panel: React.FC<PanelProps> = ({ title, children, onClose, initialPos, onDragEnd }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const { x, y } = useDraggable({ handleRef, initialPos, onDragEnd });

  const containerClasses = `${styles.panelContainer} ${isCollapsed ? styles.collapsed : ''}`;

  return (
    <div className={containerClasses} style={{ top: y, left: x }}>
      <div className={styles.panelHeader} ref={handleRef}>
        <h3 className={styles.panelTitle}>{title}</h3>
        <div className={styles.headerButtons}>
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Prevent drag from starting on click
              setIsCollapsed(!isCollapsed);
            }} 
            className={styles.controlButton}
          >
            {isCollapsed ? '□' : '−'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className={styles.controlButton}
          >
            ×
          </button>
        </div>
      </div>
      <div className={styles.panelContent}>
        {children}
      </div>
    </div>
  );
};

export default Panel;
