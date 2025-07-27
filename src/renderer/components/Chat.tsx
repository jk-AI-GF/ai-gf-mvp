import React, { useState, useEffect, useRef } from 'react';
import styles from './Chat.module.css';

interface Message {
  role: string;
  text: string;
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <div key={index} className={`${styles.message} ${getRoleStyle(msg.role)}`}>
            <strong>{msg.role === 'user' ? 'You' : 'AI'}: </strong>{msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="메시지를 입력하세요..."
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={styles.input}
        />
        <button type="submit" className={styles.button}>전송</button>
      </form>
    </div>
  );
};

export default Chat;