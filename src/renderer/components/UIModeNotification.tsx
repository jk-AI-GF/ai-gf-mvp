import React from 'react';
import styles from './UIModeNotification.module.css';

interface UIModeNotificationProps {
  message: string;
  isVisible: boolean;
}

const UIModeNotification: React.FC<UIModeNotificationProps> = ({ message, isVisible }) => {
  return (
    <div className={`${styles.notification} ${isVisible ? styles.visible : ''}`}>
      {message}
    </div>
  );
};

export default UIModeNotification;
