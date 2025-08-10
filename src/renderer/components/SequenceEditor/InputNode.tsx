
import React, { useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useStoreApi } from 'reactflow';
import { InputNodeModel, SubroutineParameter } from '../../../core/sequence/InputNodeModel';
import { getPortColor } from './node-style-utils';

const nodeStyle: React.CSSProperties = {
  background: '#383838',
  color: '#ddd',
  borderRadius: '5px',
  border: '1px solid #555',
  width: 280, // Increased width for editing UI
  fontSize: '12px',
};

const headerStyle: React.CSSProperties = {
  background: '#10A37F',
  padding: '8px',
  fontWeight: 'bold',
  textAlign: 'center',
  borderTopLeftRadius: '4px',
  borderTopRightRadius: '4px',
};

const contentStyle: React.CSSProperties = {
  padding: '10px',
};

const paramsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginBottom: '10px',
};

const paramItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
};

const inputStyle: React.CSSProperties = {
  background: '#2a2a2a',
  color: '#ddd',
  border: '1px solid #555',
  borderRadius: '3px',
  padding: '2px 4px',
  fontSize: '11px',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  background: '#555',
  color: '#ddd',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  padding: '2px 6px',
};

const InputNode: React.FC<NodeProps<InputNodeModel>> = ({ id, data }) => {
  const { setNodes } = useReactFlow();
  const store = useStoreApi();

  const updateNodeState = useCallback((model: InputNodeModel) => {
    const { nodeInternals } = store.getState();
    setNodes(
      Array.from(nodeInternals.values()).map((node) => {
        if (node.id === id) {
          return { ...node, data: model };
        }
        return node;
      })
    );
  }, [id, store, setNodes]);

  const handleAddParam = useCallback(() => {
    const newModel = data.clone() as InputNodeModel;
    newModel.addParameter({
      name: `param${data.parameters.length + 1}`,
      type: 'string',
      description: '',
    });
    updateNodeState(newModel);
  }, [data, updateNodeState]);

  const handleRemoveParam = useCallback((paramId: string) => {
    const newModel = data.clone() as InputNodeModel;
    newModel.removeParameter(paramId);
    updateNodeState(newModel);
  }, [data, updateNodeState]);

  const handleParamChange = useCallback((paramId: string, newValues: Partial<Omit<SubroutineParameter, 'id'>>) => {
    const newModel = data.clone() as InputNodeModel;
    newModel.updateParameter(paramId, newValues);
    updateNodeState(newModel);
  }, [data, updateNodeState]);


  if (!data) return null;

  const execOutPort = data.outputs.find(p => p.type === 'execution');

  return (
    <div style={nodeStyle}>
      <div style={headerStyle}>{data.name}</div>
      
      <div style={contentStyle}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>Parameters:</div>
        <div style={paramsListStyle}>
          {data.parameters.map((param) => (
            <div key={param.id} style={paramItemStyle}>
              <input
                type="text"
                value={param.name}
                onChange={(e) => handleParamChange(param.id, { name: e.target.value })}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Param Name"
              />
              <select
                value={param.type}
                onChange={(e) => handleParamChange(param.id, { type: e.target.value as SubroutineParameter['type'] })}
                style={{ ...inputStyle, flex: 0.8 }}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
              </select>
              <button onClick={() => handleRemoveParam(param.id)} style={buttonStyle}>-</button>
            </div>
          ))}
        </div>
        <button onClick={handleAddParam} style={{ ...buttonStyle, width: '100%', padding: '4px' }}>+ Add Parameter</button>
      </div>

      <hr style={{ borderColor: '#444', margin: '0 10px' }} />

      {/* Output Ports */}
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
        {execOutPort && (
          <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>Run</span>
            <Handle type="source" position={Position.Right} id={execOutPort.name} style={{ top: 'auto', background: getPortColor(execOutPort.type) }} />
          </div>
        )}
        {data.parameters.map((param) => (
          <div key={param.id} style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>{param.name}</span>
            <Handle type="source" position={Position.Right} id={param.id} style={{ top: 'auto', background: getPortColor(param.type) }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default InputNode;
