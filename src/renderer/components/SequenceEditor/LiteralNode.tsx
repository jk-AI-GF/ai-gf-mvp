import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useStoreApi } from 'reactflow';
import { LiteralNodeModel } from '../../../core/sequence/LiteralNodeModel';
import { getPortColor } from './node-style-utils';
import { ActionReturnType } from '../../../plugin-api/actions';

const inputStyle: React.CSSProperties = {
  width: '90%',
  background: '#2a2a2a',
  color: '#ddd',
  border: '1px solid #555',
  borderRadius: '3px',
  padding: '4px',
  fontSize: '12px',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    marginBottom: '5px',
};

const LiteralNode: React.FC<NodeProps<LiteralNodeModel>> = ({ id, data }) => {
    const { setNodes } = useReactFlow();
    const store = useStoreApi();

    const onValueChange = useCallback((newValue: any) => {
        const { nodeInternals } = store.getState();
        setNodes(
            Array.from(nodeInternals.values()).map((node) => {
                if (node.id === id) {
                    const newModel = node.data.clone() as LiteralNodeModel;
                    newModel.setValue(newValue);
                    return { ...node, data: newModel };
                }
                return node;
            })
        );
    }, [id, store, setNodes]);

    const onTypeChange = useCallback((newType: ActionReturnType) => {
        const { nodeInternals } = store.getState();
        setNodes(
            Array.from(nodeInternals.values()).map((node) => {
                if (node.id === id) {
                    const newModel = node.data.clone() as LiteralNodeModel;
                    newModel.setDataType(newType);
                    return { ...node, data: newModel };
                }
                return node;
            })
        );
    }, [id, store, setNodes]);

    const renderInput = () => {
        switch (data.dataType) {
            case 'string':
                return <input type="text" value={data.value} onChange={(e) => onValueChange(e.target.value)} style={inputStyle} />;
            case 'number':
                return <input type="number" value={data.value} onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)} style={inputStyle} />;
            case 'boolean':
                return <input type="checkbox" checked={!!data.value} onChange={(e) => onValueChange(e.target.checked)} style={{ marginLeft: '5px' }} />;
            default:
                return null;
        }
    };

    const outputPort = data.outputs.find(p => p.name === 'returnValue');

    return (
        <div style={{
            background: '#383838',
            color: '#ddd',
            borderRadius: '5px',
            border: '1px solid #555',
            width: 200,
            fontSize: '12px',
        }}>
            <div style={{ background: '#4a4a4a', padding: '8px', fontWeight: 'bold', textAlign: 'center', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
                Literal Value
            </div>
            <div style={{ padding: '10px', display: 'flex' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <select value={data.dataType} onChange={(e) => onTypeChange(e.target.value as ActionReturnType)} style={selectStyle}>
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                    </select>
                    {renderInput()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: '10px' }}>
                    {outputPort && (
                        <div style={{ position: 'relative', paddingRight: '15px', height: '16px', lineHeight: '16px', display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '15px' }}>Value</span>
                            <Handle type="source" position={Position.Right} id={outputPort.name} style={{ top: '50%', background: getPortColor(outputPort.type) }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(LiteralNode);
