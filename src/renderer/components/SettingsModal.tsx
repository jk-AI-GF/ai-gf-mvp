import React from 'react';
import { useAppContext } from '../contexts/AppContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    apiKey,
    setApiKey,
    persona,
    setPersona,
    windowOpacity,
    setWindowOpacity,
  } = useAppContext();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        style={{
          width: '600px',
          maxHeight: '90vh',
          background: 'rgba(20,20,20,0.95)',
          padding: '20px',
          borderRadius: '10px',
          color: '#fff',
          overflowY: 'auto',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
          position: 'relative', // For positioning the close button
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '1.5rem',
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        <h2
          style={{
            marginTop: 0,
            marginBottom: '20px',
            fontSize: '1.8rem',
            textAlign: 'center',
          }}
        >
          설정
        </h2>

        {/* Opacity Control */}
        <div style={{ marginBottom: '25px' }}>
          <label
            htmlFor="opacity-slider"
            style={{
              fontSize: '1.1rem',
              color: '#ccc',
              display: 'block',
              marginBottom: '10px',
            }}
          >
            창 투명도: {Math.round(windowOpacity * 100)}%
          </label>
          <input
            type="range"
            id="opacity-slider"
            min="0.1"
            max="1"
            step="0.05"
            value={windowOpacity}
            onChange={(e) => setWindowOpacity(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <h3
          style={{
            marginTop: '20px',
            marginBottom: '15px',
            fontSize: '1.5rem',
            borderBottom: '1px solid #444',
            paddingBottom: '5px',
          }}
        >
          챗봇 LLM API
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label htmlFor="llm-api-key" style={{ fontSize: '1.1rem', color: '#ccc' }}>
            API 키
          </label>
          <input
            type="text"
            id="llm-api-key"
            name="llm-api-key"
            placeholder="API 키를 입력하세요"
            style={{
              padding: '10px',
              border: '1px solid #444',
              borderRadius: '5px',
              backgroundColor: '#333',
              color: '#eee',
              fontSize: '1rem',
            }}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <h3
          style={{
            marginTop: '25px',
            marginBottom: '15px',
            fontSize: '1.5rem',
            borderBottom: '1px solid #444',
            paddingBottom: '5px',
          }}
        >
          페르소나
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <textarea
            id="persona-text"
            name="persona-text"
            rows={5}
            placeholder="페르소나를 입력하세요"
            style={{
              padding: '10px',
              border: '1px solid #444',
              borderRadius: '5px',
              backgroundColor: '#333',
              color: '#eee',
              fontSize: '1rem',
              resize: 'vertical',
            }}
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

