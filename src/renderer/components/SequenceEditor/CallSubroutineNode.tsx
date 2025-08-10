import React, { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useStoreApi } from 'reactflow';
import { CallSubroutineNodeModel } from '../../../core/sequence/CallSubroutineNodeModel';
import { InputNodeModel } from '../../../core/sequence/InputNodeModel';
import { useAppContext } from '../../contexts/AppContext';
import { getPortColor } from './node-style-utils';

const nodeStyle: React.CSSProperties = {
  background: '#383838',
  color: '#ddd',
  borderRadius: '5px',
  border: '1px solid #555',
  width: 250,
  fontSize: '12px',
};

const headerStyle: React.CSSProperties = {
  background: '#6a1b9a', // A distinct color for subroutine calls
  padding: '8px',
  fontWeight: 'bold',
  textAlign: 'center',
  borderTopLeftRadius: '4px',
  borderTopRightRadius: '4px',
};

const contentStyle: React.CSSProperties = {
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: '#2a2a2a',
  color: '#ddd',
  border: '1px solid #555',
  borderRadius: '3px',
  padding: '4px',
  fontSize: '11px',
  boxSizing: 'border-box',
};

const CallSubroutineNode: React.FC<NodeProps<CallSubroutineNodeModel>> = ({ id, data }) => {
  const { setNodes } = useReactFlow();
  const store = useStoreApi();
  const { sequenceManager } = useAppContext();
  const [subroutines, setSubroutines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all available subroutines on mount
  useEffect(() => {
    const fetchSubroutines = async () => {
      if (!sequenceManager) return;
      setIsLoading(true);
      try {
        const subroutineFiles = await window.electronAPI.getSubroutineFiles();
        setSubroutines(subroutineFiles);
      } catch (error) {
        console.error("Failed to fetch subroutines:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubroutines();
  }, [sequenceManager]);

  const handleSubroutineChange = useCallback(async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSubroutineId = event.target.value;
    if (!newSubroutineId || !sequenceManager) {
      return;
    }

    try {
      // Load the selected subroutine to get its parameters
      const sequenceData = await (sequenceManager as any).loadAndDeserializeSequence(newSubroutineId);
      if (!sequenceData) return;

      const inputNode = sequenceData.nodes.find((n: any) => n.data instanceof InputNodeModel);
      const parameters = inputNode ? (inputNode.data as InputNodeModel).parameters : [];

      // Create a new model instance to maintain immutability
      const newModel = data.clone() as CallSubroutineNodeModel;
      newModel.setSubroutine(newSubroutineId, parameters);

      // Update the nodes in React Flow
      const { nodeInternals } = store.getState();
      setNodes(
        Array.from(nodeInternals.values()).map((node) => {
          if (node.id === id) {
            return { ...node, data: newModel };
          }
          return node;
        })
      );
    } catch (error) {
      console.error(`Failed to set subroutine ${newSubroutineId}:`, error);
    }
  }, [id, data, sequenceManager, store, setNodes]);

  if (!data) return null;

  const { name, inputs, outputs } = data;
  const execInPort = inputs.find(p => p.type === 'execution');
  const dataInPorts = inputs.filter(p => p.type !== 'execution');
  const execOutPort = outputs.find(p => p.type === 'execution');

  return (
    <div style={nodeStyle}>
      <div style={headerStyle}>{name}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Input Ports */}
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start', width: '50%' }}>
          {execInPort && (
            <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
              <Handle type="target" position={Position.Left} id={execInPort.name} style={{ top: 'auto', background: getPortColor(execInPort.type) }} />
              <span style={{ marginLeft: '15px' }}>Exec In</span>
            </div>
          )}
          {dataInPorts.map(port => (
            <div key={port.name} style={{ position: 'relative', paddingLeft: '15px', height: '16px', lineHeight: '16px' }}>
              <Handle type="target" position={Position.Left} id={port.name} style={{ top: '50%', background: getPortColor(port.type) }} />
              <span>{port.name}</span>
            </div>
          ))}
        </div>
        {/* Output Ports */}
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', width: '50%' }}>
          {execOutPort && (
            <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '15px' }}>Exec Out</span>
              <Handle type="source" position={Position.Right} id={execOutPort.name} style={{ top: 'auto', background: getPortColor(execOutPort.type) }} />
            </div>
          )}
        </div>
      </div>
      <div style={contentStyle}>
        <label htmlFor={`subroutine-select-${id}`} style={{ fontSize: '10px', marginBottom: '-4px' }}>Subroutine</label>
        <select
          id={`subroutine-select-${id}`}
          value={data.subroutineId || ''}
          onChange={handleSubroutineChange}
          style={selectStyle}
          disabled={isLoading}
        >
          <option value="">{isLoading ? 'Loading...' : '-- Select Subroutine --'}</option>
          {subroutines.map(file => <option key={file} value={file}>{file}</option>)}
        </select>
      </div>
    </div>
  );
};

export default memo(CallSubroutineNode);
