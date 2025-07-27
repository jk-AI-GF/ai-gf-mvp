import React from 'react';
import styles from './FloatingMessage.module.css';

interface FloatingMessageProps {
  id: number;
  text: string;
  onFadeOut: () => void;
}

const FloatingMessage: React.FC<FloatingMessageProps> = ({ text, onFadeOut }) => {
  return (
    <div className={styles.message} onAnimationEnd={onFadeOut}>
      {text}
    </div>
  );
};

export default FloatingMessage;