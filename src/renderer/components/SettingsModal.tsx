import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [persona, setPersona] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Load settings from localStorage when the modal is opened
  useEffect(() => {
    if (isOpen) {
      const savedApiKey = localStorage.getItem('llmApiKey') || '';
      setApiKey(savedApiKey);

      const savedPersona = localStorage.getItem('userPersona') || '';
      setPersona(savedPersona);
      // If no persona in local storage, try to load from default file
      if (!savedPersona) {
        loadDefaultPersona();
      }
    }
  }, [isOpen]);

  const showSaveMessage = (message: string) => {
    setSaveMessage(message);
    setTimeout(() => {
      setSaveMessage('');
    }, 2000);
  };

  const loadDefaultPersona = async () => {
    try {
      const response = await fetch('assets/Persona/persona.txt');
      const text = await response.text();
      setPersona(text.trim());
    } catch (error) {
      console.error('Failed to load default persona.txt:', error);
    }
  };

  const handleApiKeySave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('llmApiKey', apiKey);
    showSaveMessage('API 키가 저장되었습니다.');
  };

  const handlePersonaSave = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('userPersona', persona);
    (window as any).personaText = persona; // Update global persona for older parts of the app
    try {
      await (window as any).electronAPI.savePersonaToFile(persona);
      showSaveMessage('페르소나가 저장되었습니다.');
    } catch (error) {
      console.error('Error saving persona to file:', error);
      showSaveMessage('페르소나 저장에 실패했습니다.');
    }
  };

  const handleLoadPersonaFromFile = async () => {
    try {
      const personaContent = await (window as any).electronAPI.openPersonaFile();
      if (personaContent !== null) {
        setPersona(personaContent);
        localStorage.setItem('userPersona', personaContent);
        (window as any).personaText = personaContent;
        showSaveMessage('페르소나를 파일에서 불러왔습니다!');
      }
    } catch (error) {
      console.error('Error loading persona from file:', error);
      showSaveMessage('페르소나 파일 불러오기 실패.');
    }
  };

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
        zIndex: 100
      }}
      onClick={onClose}
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
          position: 'relative' // For positioning the close button
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            background: 'none', 
            border: 'none', 
            color: '#fff', 
            fontSize: '1.5rem', 
            cursor: 'pointer' 
          }}>×</button>
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.8rem', textAlign: 'center' }}>챗봇 LLM API 설정</h2>
        <form onSubmit={handleApiKeySave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label htmlFor="llm-api-key" style={{ fontSize: '1.1rem', color: '#ccc' }}>LLM API 키</label>
          <input 
            type="text" 
            id="llm-api-key" 
            name="llm-api-key" 
            placeholder="API 키를 입력하세요" 
            required 
            style={{ padding: '10px', border: '1px solid #444', borderRadius: '5px', backgroundColor: '#333', color: '#eee', fontSize: '1rem' }}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1.1rem' }}>저장</button>
        </form>
        <h2 style={{ marginTop: '20px', marginBottom: '20px', fontSize: '1.8rem', textAlign: 'center' }}>페르소나 설정</h2>
        <form onSubmit={handlePersonaSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label htmlFor="persona-text" style={{ fontSize: '1.1rem', color: '#ccc' }}>페르소나 텍스트</label>
          <textarea 
            id="persona-text" 
            name="persona-text" 
            rows={5} 
            placeholder="페르소나를 입력하세요" 
            style={{ padding: '10px', border: '1px solid #444', borderRadius: '5px', backgroundColor: '#333', color: '#eee', fontSize: '1rem', resize: 'vertical' }}
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          ></textarea>
          <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1.1rem' }}>저장</button>
          <button onClick={handleLoadPersonaFromFile} type="button" style={{ padding: '12px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1.1rem' }}>파일에서 불러오기</button>
        </form>
        
        {/* We will handle background settings later */}
        <h2 style={{ marginTop: '20px', marginBottom: '20px', fontSize: '1.8rem', textAlign: 'center' }}>배경 설정</h2>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label htmlFor="background-color-picker" style={{ fontSize: '1.1rem', color: '#ccc' }}>배경 색상</label>
          <input type="color" id="background-color-picker" name="background-color-picker" defaultValue="#36393f" style={{ width: '100%', height: '40px', border: 'none', padding: 0 }} />
        </form>

        {saveMessage && <div style={{ color: 'lightgreen', marginTop: '15px', fontSize: '0.9rem', textAlign: 'center' }}>{saveMessage}</div>}
      </div>
    </div>
  );
};

export default SettingsModal;

