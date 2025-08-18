import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Chat.module.css';
import { useAppContext } from '../contexts/AppContext';
import { useDraggable } from '../hooks/useDraggable';

interface Message {
  role: string;
  text: string;
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage }) => {
  const { isUiInteractive } = useAppContext();
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const initialPos = useMemo(() => ({
    x: window.innerWidth / 2,
    y: 0, // Y is not used, but required
  }), []);

  const position = useDraggable({
    handleRef: chatContainerRef,
    axis: 'x',
    initialPos: initialPos
  });

  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'user':
        return styles.user;
      case 'assistant':
        return styles.assistant;
      case 'system':
        return styles.system;
      default:
        return ''; // Return empty string for unknown roles
    }
  };

  const dynamicStyle: React.CSSProperties = {
    left: `${position.x}px`,
    transform: isUiInteractive 
      ? `translateX(-50%)` 
      : `translateX(-50%) translateY(150%)`,
    opacity: isUiInteractive ? 1 : 0,
    pointerEvents: isUiInteractive ? 'auto' : 'none',
  };

  return (
    <div 
      ref={chatContainerRef}
      className={styles.chatContainer}
      style={dynamicStyle}
    >
      <div className={styles.chatHeader}>
        <button 
          className={styles.toggleButton} 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? t('chat.closeLog') : t('chat.openLog')}
        </button>
      </div>
      <div className={`${styles.messages} ${isExpanded ? styles.expanded : ''}`}>
        {messages.map((msg, index) => (
          <div key={index} className={`${styles.message} ${getRoleStyle(msg.role)}`}>
            <strong>{msg.role === 'user' ? t('chat.you') : t('chat.ai')}: </strong>{msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder={t('chat.placeholder')}
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={styles.input}
        />
        <button type="submit" className={styles.button}>{t('chat.send')}</button>
      </form>
    </div>
  );
};

export default Chat;