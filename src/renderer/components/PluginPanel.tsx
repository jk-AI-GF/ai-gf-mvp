import React, { useState, useEffect } from 'react';

interface Plugin {
  name: string;
  enabled: boolean;
}

interface PluginPanelProps {
  onClose: () => void;
}

const PluginPanel: React.FC<PluginPanelProps> = ({ onClose }) => {
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
      // Force re-render by updating state
      setPlugins(plugins.map(p => p.name === pluginName ? { ...p, enabled } : p));
    }
  };

  return (
    <div className="control-panel" style={{ display: 'block' }}>
      <button className="control-panel-minimize-button">-</button>
      <button className="control-panel-close-button" onClick={onClose}>×</button>
      <h3>플러그인 관리</h3>
      <div id="plugins-list">
        {plugins.length > 0 ? (
          plugins.map(plugin => (
            <div key={plugin.name} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id={`plugin-toggle-${plugin.name}`}
                checked={plugin.enabled}
                onChange={(e) => handleToggle(plugin.name, e.target.checked)}
                style={{ marginRight: '10px', width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor={`plugin-toggle-${plugin.name}`} style={{ color: 'white', fontSize: '1.1rem', cursor: 'pointer' }}>
                {plugin.name}
              </label>
            </div>
          ))
        ) : (
          <p>플러그인 관리자를 찾을 수 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default PluginPanel;
