
import React, { useState, useEffect } from 'react';
import eventBus from '../../core/event-bus';

const CameraControl: React.FC = () => {
  const [isFreeCamera, setIsFreeCamera] = useState(true);

  useEffect(() => {
    const handleModeChange = (newMode: 'free' | 'follow') => {
      setIsFreeCamera(newMode === 'free');
    };

    eventBus.on('camera:modeChanged', handleModeChange);

    // Ask the main renderer for the current state upon mounting
    eventBus.emit('camera:requestState');

    return () => {
      eventBus.off('camera:modeChanged', handleModeChange);
    };
  }, []);

  const handleClick = () => {
    eventBus.emit('camera:toggleMode');
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', left: '32px', zIndex: 9999 }}>
      <button 
        onClick={handleClick}
        style={{ 
          padding: '10px', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: 'pointer',
          backgroundColor: isFreeCamera ? '#888888' : '#4CAF50'
        }}
      >
        {isFreeCamera ? '자유카메라' : '따라가기'}
      </button>
    </div>
  );
};

export default CameraControl;
