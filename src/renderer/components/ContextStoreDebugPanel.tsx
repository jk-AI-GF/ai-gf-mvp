import React, { useState, useEffect } from 'react';
import Panel from './Panel';
import styles from './ContextStoreDebugPanel.module.css';
import { useAppContext } from '../contexts/AppContext';

interface ContextStoreDebugPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const ContextStoreDebugPanel: React.FC<ContextStoreDebugPanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const { contextStore } = useAppContext();
  const [contextData, setContextData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!contextStore) return;

    // Function to update the state from the store
    const updateContextData = () => {
      setContextData(contextStore.getAll());
    };

    // Initial fetch
    updateContextData();

    // Subscribe to future updates
    const unsubscribe = contextStore.subscribe(updateContextData);

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [contextStore]);

  return (
    <Panel title="컨텍스트 스토어 뷰어" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      <div className={styles.container}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(contextData).length > 0 ? (
              Object.entries(contextData).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td><pre>{JSON.stringify(value, null, 2)}</pre></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className={styles.emptyMessage}>No data in context store.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

export default ContextStoreDebugPanel;
