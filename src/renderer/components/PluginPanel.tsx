import React, { useState, useEffect } from 'react';
import Panel from './Panel';
import { useAppContext } from '../contexts/AppContext';
import { IPlugin } from '../../plugins/plugin-manager';

interface PluginPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const PluginPanel: React.FC<PluginPanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const { pluginManager } = useAppContext();
  const [plugins, setPlugins] = useState<IPlugin[]>([]);

  useEffect(() => {
    if (pluginManager) {
      const registeredPlugins = Array.from(pluginManager.plugins.values());
      setPlugins(registeredPlugins);
    }
  }, [pluginManager]);

  const handleToggle = (pluginName: string, enabled: boolean) => {
    if (pluginManager) {
      if (enabled) {
        pluginManager.enable(pluginName);
      } else {
        pluginManager.disable(pluginName);
      }
      // Re-fetch the state from the manager to ensure consistency
      const updatedPlugins = Array.from(pluginManager.plugins.values());
      setPlugins(updatedPlugins);
    }
  };

  return (
    <Panel title="플러그인 관리" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      {plugins.length > 0 ? (
        plugins.map(plugin => (
          <div key={plugin.name} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #333' }}>
            <label htmlFor={`plugin-toggle-${plugin.name}`} style={{ flexGrow: 1, cursor: 'pointer' }}>
              {plugin.name}
            </label>
            <input
              type="checkbox"
              id={`plugin-toggle-${plugin.name}`}
              checked={plugin.enabled}
              onChange={(e) => handleToggle(plugin.name, e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
          </div>
        ))
      ) : (
        <p className="empty-message">사용 가능한 플러그인이 없습니다.</p>
      )}
    </Panel>
  );
};

export default PluginPanel;
