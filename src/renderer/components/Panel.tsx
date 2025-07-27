import React, { useState, useRef } from 'react';
import { useDraggable } from '../hooks/useDraggable';

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

  return (
    <div className={`panel-container ${isCollapsed ? 'collapsed' : ''}`} style={{ top: y, left: x }}>
      <div className="panel-header" ref={handleRef} style={{ cursor: 'move' }}>
        <h3 className="panel-title">{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Prevent drag from starting on click
              setIsCollapsed(!isCollapsed);
            }} 
            className="panel-close-button" 
            style={{ position: 'relative', right: '10px' }}
          >
            {isCollapsed ? '□' : '−'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="panel-close-button"
          >
            ×
          </button>
        </div>
      </div>
      <div className="panel-content">
        {children}
      </div>
    </div>
  );
};

export default Panel;
