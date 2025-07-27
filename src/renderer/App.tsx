import React, { useState } from 'react';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      {/* This button is temporary and will be replaced by a proper sidebar component */}
      <button 
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          zIndex: 9999 // Ensure the button is clickable
        }}
      >
        Open Settings (React)
      </button>

      <SettingsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default App;
