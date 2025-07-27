import React, { useState, useEffect } from 'react';
import Panel from './Panel';

interface Mod {
  name: string;
  version: string;
  path: string;
}

interface ModSettings {
  [key: string]: boolean;
}

interface ModManagementPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const ModManagementPanel: React.FC<ModManagementPanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const [mods, setMods] = useState<Mod[]>([]);
  const [modSettings, setModSettings] = useState<ModSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRestartMessage, setShowRestartMessage] = useState(false);

  useEffect(() => {
    const fetchMods = async () => {
      try {
        setIsLoading(true);
        const [allMods, settings] = await Promise.all([
          window.electronAPI.getAllMods(),
          window.electronAPI.getModSettings()
        ]);
        setMods(allMods);
        setModSettings(settings);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch mods:', err);
        setError('모드 목록을 불러오는 데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMods();
  }, []);

  const handleToggle = async (modName: string, isEnabled: boolean) => {
    setModSettings(prev => ({ ...prev, [modName]: isEnabled }));
    await window.electronAPI.setModEnabled(modName, isEnabled);
    setShowRestartMessage(true);
  };

  const renderContent = () => {
    if (isLoading) return <p className="empty-message">모드를 불러오는 중...</p>;
    if (error) return <p className="empty-message" style={{ color: 'red' }}>{error}</p>;
    if (mods.length === 0) return <p className="empty-message">설치된 모드가 없습니다.</p>;
    
    return mods.map(mod => {
      const isEnabled = modSettings[mod.name] !== false;
      return (
        <div key={mod.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #444' }}>
          <label htmlFor={`mod-toggle-${mod.name}`} style={{ cursor: 'pointer', flexGrow: 1 }}>
            {mod.name} (v{mod.version})
          </label>
          <input
            type="checkbox"
            id={`mod-toggle-${mod.name}`}
            checked={isEnabled}
            onChange={(e) => handleToggle(mod.name, e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
        </div>
      );
    });
  };

  return (
    <Panel title="모드 관리" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
      {renderContent()}
      {showRestartMessage && (
        <p style={{
          marginTop: '15px', padding: '8px', background: 'rgba(255, 255, 0, 0.1)',
          border: '1px solid rgba(255, 255, 0, 0.3)', borderRadius: '4px', textAlign: 'center'
        }}>
          ℹ️ 앱을 재시작하여 변경사항을 적용하세요.
        </p>
      )}
    </Panel>
  );
};

export default ModManagementPanel;
