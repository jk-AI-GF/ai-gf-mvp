import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { InputNodeModel, SubroutineParameter } from '../../../core/sequence/InputNodeModel';
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
  background: '#10A37F', // Subroutine color
  padding: '8px',
  fontWeight: 'bold',
  textAlign: 'center',
  borderTopLeftRadius: '4px',
  borderTopRightRadius: '4px',
};

const portContainerStyle: React.CSSProperties = {
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end', // Align all ports to the right
  gap: '10px',
};

const portStyle: React.CSSProperties = {
  position: 'relative',
  height: '16px',
  display: 'flex',
  alignItems: 'center',
};

const portLabelStyle: React.CSSProperties = {
  marginRight: '15px',
};

const InputNode: React.FC<NodeProps<InputNodeModel>> = ({ data }) => {
  if (!data) return null;

  const execOutPort = data.outputs.find(p => p.type === 'execution');
  const dataOutPorts = data.outputs.filter(p => p.type !== 'execution');

  // Match parameters to their corresponding ports using the parameter's id
  const getParamForPort = (portName: string): SubroutineParameter | undefined => {
    return data.parameters.find(p => p.id === portName);
  };

  return (
    <div style={nodeStyle}>
      <div style={headerStyle}>
        {data.name}
      </div>
      
      <div style={portContainerStyle}>
        {/* Execution Output Port */}
        {execOutPort && (
          <div style={portStyle}>
            <span style={portLabelStyle}>Run</span>
            <Handle
              type="source"
              position={Position.Right}
              id={execOutPort.name}
              style={{ top: 'auto', background: getPortColor(execOutPort.type) }}
            />
          </div>
        )}

        {/* Data Output Ports */}
        {dataOutPorts.map((port) => {
          const param = getParamForPort(port.name);
          return (
            <div key={port.name} style={portStyle}>
              <span style={portLabelStyle}>{param ? `${param.name} (${param.type})` : port.name}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={port.name}
                style={{ top: 'auto', background: getPortColor(port.type) }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InputNode;