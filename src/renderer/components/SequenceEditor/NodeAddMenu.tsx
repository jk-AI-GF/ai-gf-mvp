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
  border: '1px solid #555',
  borderRadius: '8px',
  boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '400px',
  width: '280px',
};

const searchInputStyle: React.CSSProperties = {
  padding: '10px',
  margin: '8px',
  background: '#222',
  border: '1px solid #444',
  borderRadius: '4px',
  color: '#eee',
  outline: 'none',
};

const listStyle: React.CSSProperties = {
  overflowY: 'auto',
  listStyle: 'none',
  padding: '0 0 8px 0',
  margin: 0,
};

const itemStyle: React.CSSProperties = {
  padding: '10px 15px',
  color: '#ccc',
  cursor: 'pointer',
};

const NodeAddMenu: React.FC<NodeAddMenuProps> = ({ x, y, actions, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredActions = useMemo(() => {
    if (!searchTerm) return actions;
    return actions.filter(action =>
      (action.description || action.name).toLowerCase().includes(searchTerm.toLowerCase())
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
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a4a4a')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {action.description || action.name}
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
