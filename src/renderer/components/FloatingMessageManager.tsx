import React, { useState, useEffect, useRef } from 'react';
import eventBus from '../../core/event-bus';
import FloatingMessage from './FloatingMessage';

interface Message {
  id: number;
  text: string;
}

const FloatingMessageManager: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messageIdCounter = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleShowMessage = ({ text }: { text: string }) => {
      setMessages([]); // Show one message at a time
      const newMessageId = messageIdCounter.current++;
      setMessages([{ id: newMessageId, text }]);
    };

    const handleUpdatePosition = ({ top, left, visible }: { top: number; left: number; visible: boolean }) => {
      if (containerRef.current) {
        if (visible) {
          const offsetX = 230; // 오른쪽으로 이동
          const offsetY = 70; // 아래로 이동
          containerRef.current.style.visibility = 'visible';
          containerRef.current.style.transform = `translate(${left + offsetX}px, ${top + offsetY}px)`;
        }
      }
    };

    eventBus.on('ui:showFloatingMessage', handleShowMessage);
    eventBus.on('ui:updateFloatingMessagePosition', handleUpdatePosition);

    return () => {
      eventBus.off('ui:showFloatingMessage', handleShowMessage);
      eventBus.off('ui:updateFloatingMessagePosition', handleUpdatePosition);
    };
  }, []);

  const handleFadeOut = (id: number) => {
    setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== id));
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      {messages.map((msg) => (
        <FloatingMessage
          key={msg.id}
          id={msg.id}
          text={msg.text}
          onFadeOut={() => handleFadeOut(msg.id)}
        />
      ))}
    </div>
  );
};

export default FloatingMessageManager;
