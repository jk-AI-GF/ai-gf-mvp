import React, { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useStoreApi } from 'reactflow';
import { ActionNodeModel } from '../../../core/sequence/ActionNodeModel';
import { IPort } from '../../../core/sequence/BaseNode';
import { getPortColor } from './node-style-utils';

// 동적 옵션을 위한 드롭다운 컴포넌트
const DynamicSelectInput = ({ param, value, onParamChange }: { param: IPort, value: any, onParamChange: (val: any) => void }) => {
  const [options, setOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let fetchedOptions: string[] = [];
        if (param.dynamicOptions === 'animations') {
          const [userResult, assetsResult] = await Promise.all([
            window.electronAPI.listDirectory('animations', 'userData'),
            window.electronAPI.listDirectory('Animation', 'assets')
          ]);

          if (userResult.error || assetsResult.error) {
            throw new Error(userResult.error || assetsResult.error);
          }

          const combinedFiles = new Set([...(userResult.files || []), ...(assetsResult.files || [])]);
          fetchedOptions = Array.from(combinedFiles).filter((file: string) => 
            file.toLowerCase().endsWith('.vrma') || file.toLowerCase().endsWith('.fbx')
          );
        } else if (param.dynamicOptions === 'sequences') {
            fetchedOptions = await window.electronAPI.getSequenceFiles();
        } else if (param.dynamicOptions === 'subroutines') {
            fetchedOptions = await window.electronAPI.getSubroutineFiles();
        } else if (param.dynamicOptions === 'poses') {
            const poseFiles = await window.electronAPI.getPoses();
            if (poseFiles) {
                fetchedOptions = poseFiles;
            }
        } else if (param.dynamicOptions === 'plugins') {
            const pluginList = await window.electronAPI.getPluginList();
            if (pluginList) {
                fetchedOptions = pluginList;
            }
        }
        setOptions(fetchedOptions);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch options';
        console.error(`Failed to fetch options for ${param.dynamicOptions}:`, errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();
  }, [param.dynamicOptions]);

  if (isLoading) {
    return <select style={inputStyle} disabled><option>로딩 중...</option></select>;
  }
  
  if (error) {
      return <select style={{...inputStyle, color: 'red'}} disabled><option>오류 발생</option></select>;
  }

  return (
    <select value={value} onChange={e => onParamChange(e.target.value)} style={inputStyle}>
      <option value="">-- 선택 --</option>
      {options.map(file => <option key={file} value={file}>{file}</option>)}
    </select>
  );
};


// 노드 내부의 입력 필드 컴포넌트
const EmbeddedInput = ({ param, value, onParamChange }: { param: IPort, value: any, onParamChange: (val: any) => void }) => {
  // 동적 옵션 힌트 확인
  if (param.dynamicOptions === 'animations' || param.dynamicOptions === 'sequences' || param.dynamicOptions === 'poses' || param.dynamicOptions === 'plugins') {
    return <DynamicSelectInput param={param} value={value} onParamChange={onParamChange} />;
  }

  switch (param.type) {
    case 'enum':
      return (
        <select 
          value={value ?? (param.options?.[0] || '')} 
          onChange={e => onParamChange(e.target.value)} 
          style={inputStyle}
        >
          {param.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    case 'any':
    case 'string':
      return <input type="text" value={value || ''} onChange={e => onParamChange(e.target.value)} style={inputStyle} />;
    case 'number':
      return <input
        type="text"
        value={value ?? ''} // null/undefined일 경우 빈 문자열로 표시
        onChange={e => {
          const strVal = e.target.value;
          if (strVal === '') {
            onParamChange(undefined); // 입력 필드를 비울 수 있도록 undefined로 설정
            return;
          }
          
          const num = parseFloat(strVal);

          // parseFloat가 전체 문자열을 성공적으로 숫자로 변환했는지 확인
          // (예: "5a"가 5로 변환되는 것을 방지)
          if (!isNaN(num) && String(num) === strVal) {
            onParamChange(num);
          } else {
            // '-'나 '5a' 같은 중간 또는 유효하지 않은 값은 문자열로 저장
            onParamChange(strVal);
          }
        }}
        style={inputStyle}
      />;
    case 'boolean':
      return <input type="checkbox" checked={!!value} onChange={e => onParamChange(e.target.checked)} style={{ marginLeft: '5px' }} />;
    default:
      return null;
  }
};

const inputStyle: React.CSSProperties = {
  width: '90%',
  background: '#2a2a2a',
  color: '#ddd',
  border: '1px solid #555',
  borderRadius: '3px',
  padding: '2px 4px',
  fontSize: '11px',
  boxSizing: 'border-box',
  marginTop: '-2px',
};

const ActionNode: React.FC<NodeProps<ActionNodeModel>> = ({ id, data }) => {
  const { setNodes } = useReactFlow();
  const store = useStoreApi();

  const onParamChange = useCallback((paramName: string, value: any) => {
    // 불변성을 유지하기 위해 노드 데이터를 직접 수정하지 않고 복제합니다.
    const newModel = data.clone() as ActionNodeModel;
    newModel.setParamValue(paramName, value);

    const { nodeInternals } = store.getState();
    setNodes(
      Array.from(nodeInternals.values()).map((node) => {
        if (node.id === id) {
          // 복제된 새 모델 인스턴스로 데이터를 교체합니다.
          return { ...node, data: newModel };
        }
        return node;
      })
    );
  }, [id, data, store, setNodes]);

  if (!data) return null;

  const { name, inputs, outputs, paramValues } = data;

  const execInPort = inputs.find(p => p.type === 'execution');
  const dataInPorts = inputs.filter(p => p.type !== 'execution');
  const execOutPort = outputs.find(p => p.type === 'execution');
  const dataOutPorts = outputs.filter(p => p.type !== 'execution');

  return (
    <div style={{
      background: '#383838',
      color: '#ddd',
      borderRadius: '5px',
      border: '1px solid #555',
      width: 250,
      fontSize: '12px',
    }}>
      <div style={{ background: '#4a4a4a', padding: '8px', fontWeight: 'bold', textAlign: 'center', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
        {name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start', width: '100%' }}>
          {execInPort && (
            <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
              <Handle type="target" position={Position.Left} id={execInPort.name} style={{ top: 'auto', background: getPortColor(execInPort.type) }} />
              <span style={{ marginLeft: '15px' }}>Exec In</span>
            </div>
          )}
          {dataInPorts.map(port => (
            <div key={port.name} style={{ width: '100%', position: 'relative', paddingLeft: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Handle type="target" position={Position.Left} id={port.name} style={{ top: '50%', background: getPortColor(port.type) }} />
              <label style={{ flex: 1 }}>{port.name}</label>
              <div style={{ width: '60%' }}>
                <EmbeddedInput param={port} value={paramValues[port.name]} onParamChange={(val) => onParamChange(port.name, val)} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
          {execOutPort && (
             <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '15px' }}>Exec Out</span>
              <Handle type="source" position={Position.Right} id={execOutPort.name} style={{ top: 'auto', background: getPortColor(execOutPort.type) }} />
            </div>
          )}
          {dataOutPorts.map(port => (
            <div key={port.name} style={{ position: 'relative', paddingRight: '15px', height: '16px', lineHeight: '16px' }}>
              <Handle type="source" position={Position.Right} id={port.name} style={{ top: '50%', background: getPortColor(port.type) }} />
              <span>{port.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(ActionNode);
