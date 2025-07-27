import React, { useState, useEffect, useRef } from 'react';
import { useDraggable } from '../hooks/useDraggable';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const { x, y } = useDraggable({ handleRef, initialPos, onDragEnd });

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
    <div className={`panel-container ${isCollapsed ? 'collapsed' : ''}`} style={{ top: y, left: x }}>
      <div className="panel-header" ref={handleRef} style={{ cursor: 'move' }}>
        <h3 className="panel-title">플러그인 관리</h3>
        <div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="panel-close-button" style={{ right: '40px' }}>{isCollapsed ? '□' : '−'}</button>
          <button onClick={onClose} className="panel-close-button">×</button>
        </div>
      </div>
      <div className="panel-content">
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
      </div>
    </div>
  );
};

export default PluginPanel;
