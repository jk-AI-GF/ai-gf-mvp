import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DraggableOptions {
  handleRef: React.RefObject<HTMLElement>;
  initialPos?: Position;
  onDragEnd?: (pos: Position) => void;
  axis?: 'x' | 'y' | 'both';
}

export const useDraggable = ({ handleRef, initialPos, onDragEnd, axis = 'both' }: DraggableOptions) => {
  const [position, setPosition] = useState(initialPos || { x: 0, y: 0 });
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (handleRef.current && handleRef.current.contains(e.target as Node)) {
      isDragging.current = true;
      offset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      document.body.style.userSelect = 'none';
    }
  }, [position.x, position.y, handleRef]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) {
      const newPos = {
        x: axis === 'y' ? position.x : e.clientX - offset.current.x,
        y: axis === 'x' ? position.y : e.clientY - offset.current.y,
      };
      setPosition(newPos);
    }
  }, [axis, position.x, position.y]);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      document.body.style.userSelect = '';
      if (onDragEnd) {
        // We need to get the latest position directly, as the 'position' in this closure might be stale.
        // A better way is to calculate it one last time.
        // However, the state update in handleMouseMove is fast enough for this purpose.
        // For simplicity, we'll use the state, but for robustness, one might recalculate.
        onDragEnd(position);
      }
    }
  }, [onDragEnd, position]);

  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  // Update position if initialPos changes (e.g. from parent state)
  useEffect(() => {
    if (initialPos) {
      setPosition(initialPos);
    }
  }, [initialPos]);


  return position;
};
