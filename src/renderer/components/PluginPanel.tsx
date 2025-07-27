import React, { useState, useEffect } from 'react';
import Panel from './Panel';

interface Plugin {
  name: string;
  enabled: boolean;
}

interface PluginPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const PluginPanel: React.FC<PluginPanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);

  useEffect(() => {
    const pluginManager = (window as any).pluginManager;
    if (pluginManager) {
      const registeredPlugins = Array.from(pluginManager.plugins.values()) as Plugin[];
      setPlugins(registeredPlugins);
    }
  }, []);

  const handleToggle = (pluginName: string, enabled: boolean) => {
    const pluginManager = (window as any).pluginManager;
    if (pluginManager) {
      if (enabled) {
        pluginManager.enable(pluginName);
      } else {
        pluginManager.disable(pluginName);
      }
      setPlugins(plugins.map(p => p.name === pluginName ? { ...p, enabled } : p));
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
        <p className="empty-message">플러그인 관리자를 찾을 수 없습니다.</p>
      )}
    </Panel>
  );
};

export default PluginPanel;
