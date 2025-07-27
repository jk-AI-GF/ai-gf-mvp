
import React, { useState, useEffect, useRef } from 'react';
import eventBus from '../../core/event-bus';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<{ role: string, text: string }[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleNewMessage = (message: { role: string, text: string }) => {
      setMessages(prev => [...prev, message]);
    };

    // Listen for new messages from the legacy system
    eventBus.on('chat:newMessage', handleNewMessage);

    // Replace the global appendMessage with an event-based one
    (window as any).appendMessage = (role: string, text: string) => {
      eventBus.emit('chat:newMessage', { role, text });
    };

    return () => {
      eventBus.off('chat:newMessage', handleNewMessage);
      // Restore original appendMessage if needed, or leave it as is
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Use the globally exposed sendChatMessage function from ChatService
    if ((window as any).sendChatMessage) {
      (window as any).sendChatMessage(input);
    } else {
      console.error('ChatService is not available.');
      // Optionally, display an error to the user
      setMessages(prev => [...prev, { role: 'system', text: '오류: 채팅 서비스가 초기화되지 않았습니다.' }]);
    }
    setInput('');
  };

  return (
    <div id="chat-container" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '600px', zIndex: 1000, background: 'rgba(0,0,0,0.6)', borderRadius: '10px', padding: '10px', color: 'white' }}>
      <div id="chat-messages" style={{ height: '150px', overflowY: 'auto', marginBottom: '10px', paddingRight: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.role}`}>
            <strong>{msg.role === 'user' ? 'You' : 'AI'}: </strong>{msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form id="chat-form" onSubmit={handleSubmit} style={{ display: 'flex' }}>
        <input
          type="text"
          id="chat-input"
          placeholder="메시지를 입력하세요..."
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '5px', border: 'none', marginRight: '5px' }}
        />
        <button type="submit" style={{ padding: '8px 12px', borderRadius: '5px', border: 'none', background: '#3498db', color: 'white', cursor: 'pointer' }}>전송</button>
      </form>
    </div>
  );
};

export default Chat;
