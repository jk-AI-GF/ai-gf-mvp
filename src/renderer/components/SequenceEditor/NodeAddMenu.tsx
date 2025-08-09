import React, { useState, useMemo } from 'react';
import { ActionDefinition } from '../../../plugin-api/actions';

interface NodeAddMenuProps {
  x: number;
  y: number;
  actions: ActionDefinition[];
  onSelect: (actionName: string) => void;
  onClose: () => void;
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  background: '#2d2d2d',
  // border: '1px solid #555', // 테두리 제거
  // borderRadius: '8px', // 둥근 모서리 제거
  boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '400px',
  width: '280px',
};

const searchInputStyle: React.CSSProperties = {
  padding: '8px', // 패딩 축소
  margin: '5px', // 마진 축소
  background: '#222',
  border: '1px solid #444',
  borderRadius: '4px',
  color: '#eee',
  outline: 'none',
  fontSize: '12px', // 폰트 크기 명시
};

const listStyle: React.CSSProperties = {
  overflowY: 'auto',
  listStyle: 'none',
  padding: '0', // 패딩 제거
  margin: 0,
};

const itemStyle: React.CSSProperties = {
  padding: '5px 12px', // 패딩 재조정
  color: '#ccc',
  cursor: 'pointer',
  borderBottom: '1px solid #404040', // 구분선 색상 조정
};

const itemNameStyle: React.CSSProperties = {
  fontWeight: 'bold',
  color: '#eee',
  fontSize: '12px',
};

const itemDescStyle: React.CSSProperties = {
  color: '#999',
  fontSize: '10px',
  marginTop: '2px',
};

const NodeAddMenu: React.FC<NodeAddMenuProps> = ({ x, y, actions, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredActions = useMemo(() => {
    if (!searchTerm) return actions;
    return actions.filter(action =>
      action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [actions, searchTerm]);

  const handleSelect = (actionName: string) => {
    onSelect(actionName);
    onClose();
  };

  return (
    <div style={{ ...menuStyle, top: y, left: x }} onContextMenu={(e) => e.preventDefault()}>
      <input
        type="text"
        placeholder="Search nodes..."
        style={searchInputStyle}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        autoFocus
      />
      <ul style={listStyle}>
        {filteredActions.length > 0 ? (
          filteredActions.map(action => (
            <li
              key={action.name}
              style={itemStyle}
              onClick={() => handleSelect(action.name)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3a3a3a')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={itemNameStyle}>{action.name}</div>
              <div style={itemDescStyle}>{action.description}</div>
            </li>
          ))
        ) : (
          <li style={{ ...itemStyle, cursor: 'default', color: '#888' }}>No results found</li>
        )}
      </ul>
    </div>
  );
};

export default NodeAddMenu;
