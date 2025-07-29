import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SUPPORTED_MODELS } from '../../core/llm-settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  padding: '10px',
  border: '1px solid #444',
  borderRadius: '5px',
  backgroundColor: '#333',
  color: '#eee',
  fontSize: '1rem',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  color: '#ccc',
  display: 'block',
  marginBottom: '10px',
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    persona,
    setPersona,
    windowOpacity,
    setWindowOpacity,
    llmSettings,
    setLlmSettings,
  } = useAppContext();

  if (!isOpen) {
    return null;
  }

  const handleApiKeyChange = (provider: keyof typeof llmSettings.apiKeys, value: string) => {
    setLlmSettings({
      apiKeys: {
        ...llmSettings.apiKeys,
        [provider]: value,
      },
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        style={{
          width: '600px',
          maxHeight: '90vh',
          background: 'rgba(20,20,20,0.95)',
          padding: '30px',
          borderRadius: '10px',
          color: '#fff',
          overflowY: 'auto',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
          position: 'relative',
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
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            color: '#aaa',
            fontSize: '1.8rem',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <h2 style={{ marginTop: 0, marginBottom: '30px', fontSize: '1.8rem', textAlign: 'center' }}>
          설정
        </h2>

        {/* Opacity Control */}
        <div style={{ marginBottom: '30px' }}>
          <label htmlFor="opacity-slider" style={labelStyle}>
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

        <h3 style={{ marginTop: '20px', marginBottom: '20px', fontSize: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
          챗봇 LLM API
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="llm-model" style={labelStyle}>모델 선택</label>
            <select
              id="llm-model"
              value={llmSettings.selectedModel}
              onChange={(e) => setLlmSettings({ selectedModel: e.target.value })}
              style={inputStyle}
            >
              {SUPPORTED_MODELS.map(model => (
                <option key={model.id} value={model.id}>{model.displayName}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="openai-api-key" style={labelStyle}>OpenAI API 키</label>
            <input
              type="password"
              id="openai-api-key"
              placeholder="sk-..."
              style={inputStyle}
              value={llmSettings.apiKeys.openAI}
              onChange={(e) => handleApiKeyChange('openAI', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="google-api-key" style={labelStyle}>Google API 키</label>
            <input
              type="password"
              id="google-api-key"
              placeholder="AIzaSy..."
              style={inputStyle}
              value={llmSettings.apiKeys.google}
              onChange={(e) => handleApiKeyChange('google', e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="anthropic-api-key" style={labelStyle}>Anthropic API 키</label>
            <input
              type="password"
              id="anthropic-api-key"
              placeholder="sk-ant-..."
              style={inputStyle}
              value={llmSettings.apiKeys.anthropic}
              onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="temperature-slider" style={labelStyle}>
              Temperature: {llmSettings.temperature.toFixed(2)}
            </label>
            <input
              type="range"
              id="temperature-slider"
              min="0"
              max="2"
              step="0.01"
              value={llmSettings.temperature}
              onChange={(e) => setLlmSettings({ temperature: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label htmlFor="max-tokens-input" style={labelStyle}>
              Max Tokens: {llmSettings.maxTokens}
            </label>
            <input
              type="number"
              id="max-tokens-input"
              min="1"
              step="1"
              value={llmSettings.maxTokens}
              onChange={(e) => setLlmSettings({ maxTokens: parseInt(e.target.value, 10) || 1 })}
              style={inputStyle}
            />
          </div>
        </div>

        <h3 style={{ marginTop: '30px', marginBottom: '15px', fontSize: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
          페르소나
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <textarea
            id="persona-text"
            rows={5}
            placeholder="AI의 역할을 정의해주세요. 예: 당신은 친절한 AI 비서입니다."
            style={{ ...inputStyle, resize: 'vertical' }}
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

