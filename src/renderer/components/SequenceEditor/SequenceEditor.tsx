import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  useReactFlow,
  Node,
  applyEdgeChanges,
  EdgeChange,
  EdgeSelectionChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppContext } from '../../contexts/AppContext';
import { ActionDefinition, ActionParam, ActionReturnType } from '../../../plugin-api/actions';
import ActionNode from './ActionNode';
import ManualStartNode from './ManualStartNode';
import EventNode from './EventNode'; // Import the new event node
import LiteralNode from './LiteralNode'; // Import the new literal node
import DelayNode from './DelayNode'; // Import the new delay node
import BranchNode from './BranchNode'; // Import the new branch node
import OperatorNode from './OperatorNode';
import RandomNode from './RandomNode';
import InputNode from './InputNode';
import CallSubroutineNode from './CallSubroutineNode'; // Import the new node
import MousePositionNode from './MousePositionNode';
import DataProviderNode from './DataProviderNode'; // Import the new data provider node

// Define node types for React Flow
const nodeTypes = {
  actionNode: ActionNode,
  manualStartNode: ManualStartNode,
  eventNode: EventNode, // Add the new event node type
  literalNode: LiteralNode,
  delayNode: DelayNode,
  branchNode: BranchNode,
  operatorNode: OperatorNode,
  randomNode: RandomNode,
  clockNode: ClockNode,
  numToStrNode: NumToStrNode,
  subroutineInputNode: InputNode,
  callSubroutineNode: CallSubroutineNode, // Register the new node
  mousePositionNode: MousePositionNode,
  dataProviderNode: DataProviderNode, // Register the new data provider node type
};

// Define default options for all edges to make them interactive
const defaultEdgeOptions = {
  interactionWidth: 20, // Makes a 20px wide area around the edge clickable
};

interface SequenceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  sequenceToLoad?: string | null;
}

import { ActionNodeModel } from '../../../core/sequence/ActionNodeModel';
import { ManualStartNodeModel } from '../../../core/sequence/ManualStartNodeModel';
import { EventNodeModel } from '../../../core/sequence/EventNodeModel';
import { LiteralNodeModel } from '../../../core/sequence/LiteralNodeModel';
import { DelayNodeModel } from '../../../core/sequence/DelayNodeModel';
import { BranchNodeModel } from '../../../core/sequence/BranchNodeModel';
import { OperatorNodeModel } from '../../../core/sequence/OperatorNodeModel';
import { RandomNodeModel } from '../../../core/sequence/RandomNodeModel';
import { ClockNodeModel } from '../../../core/sequence/ClockNodeModel';
import { NumToStrNodeModel } from '../../../core/sequence/NumToStrNodeModel';
import { InputNodeModel } from '../../../core/sequence/InputNodeModel';
import { CallSubroutineNodeModel } from '../../../core/sequence/CallSubroutineNodeModel';
import { MousePositionNodeModel } from '../../../core/sequence/MousePositionNodeModel';
import { DataProviderNodeModel } from '../../../core/sequence/DataProviderNodeModel';

import ClockNode from './ClockNode';
import NumToStrNode from './NumToStrNode';

import { BaseNode, IPort } from '../../../core/sequence/BaseNode';
import { EVENT_DEFINITIONS, EventDefinition } from '../../../core/event-definitions';
import { DataProviderDefinition } from '../../../plugin-api/data-providers';
import eventBus from '../../../core/event-bus';

let id = 0;
const getId = () => `dndnode_${id++}`;

// Add serialization interfaces
interface SerializedNodeData {
  nodeType: 'ActionNodeModel' | 'ManualStartNodeModel' | 'EventNodeModel' | 'LiteralNodeModel' | 'DelayNodeModel' | 'BranchNodeModel' | 'OperatorNodeModel' | string;
  actionName?: string;
  paramValues?: Record<string, any>;
  eventName?: string;
  dataType?: ActionReturnType;
  value?: any;
  delay?: number;
}

interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: SerializedNodeData;
}

interface SerializedEdge {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
}

interface SerializedSequence {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}


import styles from './SequenceEditor.module.css';

// Simple tag‑style input for comma‑separated metadata (capabilities, locks)
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}
const TagInput: React.FC<TagInputProps> = ({ tags, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onChange([...tags, inputValue.trim()]);
      setInputValue('');
      e.preventDefault();
    }
  };
  const removeTag = (idx: number) => {
    const newTags = tags.filter((_, i) => i !== idx);
    onChange(newTags);
  };
  return (
    <div className={styles.tagInputContainer}>
      {tags.map((tag, idx) => (
        <span key={idx} className={styles.tag}>
          {tag}
          <button type="button" className={styles.tagRemove} onClick={() => removeTag(idx)}>×</button>
        </span>
      ))}
      <input
        className={styles.tagInput}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    </div>
  );
};

// 포트 타입을 CSS 모듈 클래스 이름으로 매핑합니다.
const EDGE_CLASS_MAP: { [key: string]: string } = {
  execution: 'edgeExecution',
  string: 'edgeString',
  number: 'edgeNumber',
  boolean: 'edgeBoolean',
  enum: 'edgeEnum',
  any: 'edgeAny',
  default: 'edgeDefault',
};

const SequenceEditorComponent: React.FC<{ sequenceToLoad?: string | null, onClose: () => void }> = ({ sequenceToLoad, onClose }) => {
  const { actionRegistry, dataProviderRegistry, sequenceManager } = useAppContext();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition, getNodes, getEdges, fitView } = useReactFlow();
  const [actions, setActions] = useState<ActionDefinition[]>([]);
  const [dataProviders, setDataProviders] = useState<DataProviderDefinition[]>([]);
  const [events, setEvents] = useState<EventDefinition[]>([]);
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [locks, setLocks] = useState<string[]>([]);

  const isSubroutine = nodes.some(node => node.type === 'subroutineInputNode');

  const loadSequenceData = useCallback(async (sequenceJsonString: string) => {
    if (!sequenceManager) {
      console.error("SequenceManager is not available for loading data.");
      return;
    }
    const serializedSequence = JSON.parse(sequenceJsonString);
    if (!serializedSequence || !serializedSequence.nodes || !serializedSequence.edges) {
      console.error('잘못된 시퀀스 파일 형식입니다.');
      return;
    }

    let maxId = -1;
    serializedSequence.nodes.forEach((node: SerializedNode) => {
      if (node.id.startsWith('dndnode_')) {
        const numPart = parseInt(node.id.split('_')[1], 10);
        if (!isNaN(numPart) && numPart > maxId) {
          maxId = numPart;
        }
      }
    });
    id = maxId + 1;

    const { nodes: newNodes, edges: rawEdges } = await sequenceManager.deserializeSequence(serializedSequence);

    // Set the description and metadata from the loaded file
    setDescription(serializedSequence.description || '');
    setCapabilities(serializedSequence.capabilities || []);
    setLocks(serializedSequence.locks || []);

    const styledEdges = rawEdges.map((edge: SerializedEdge) => {
      const sourceNode = newNodes.find((node: Node) => node.id === edge.source);
      const sourceInstance = sourceNode?.data as BaseNode;
      const sourcePort = sourceInstance?.outputs.find(p => p.name === edge.sourceHandle);
      const portType = sourcePort?.type || 'default';
      
      // styles[variable] 형태로 클래스를 동적으로 가져옵니다.
      const edgeClassName = (styles as unknown as { [key: string]: string })[EDGE_CLASS_MAP[portType] || EDGE_CLASS_MAP.default];

      return {
        ...edge,
        className: edgeClassName,
      };
    });

    setNodes(newNodes);
    setEdges(styledEdges);

    setTimeout(() => {
      fitView();
    }, 50);

    console.log('시퀀스를 성공적으로 불러왔습니다.');
  }, [setNodes, setEdges, sequenceManager, fitView, setDescription, setCapabilities, setLocks]);

  // Auto-load sequence if sequenceToLoad is provided
  useEffect(() => {
    if (sequenceToLoad) {
      const load = async () => {
        try {
          const filePath = await window.electronAPI.resolvePath('userData', `sequences/${sequenceToLoad}`);
          const sequenceJSON = await window.electronAPI.readAbsoluteFile(filePath);
          if (sequenceJSON instanceof ArrayBuffer) {
            loadSequenceData(new TextDecoder().decode(sequenceJSON));
          } else {
            console.error(`Failed to read sequence file for editing: ${sequenceToLoad}`, sequenceJSON.error);
          }
        } catch (error) {
          console.error(`Error auto-loading sequence ${sequenceToLoad}:`, error);
        }
      };
      load();
    }
  }, [sequenceToLoad, loadSequenceData]);

  useEffect(() => {
    if (actionRegistry) {
      setActions(actionRegistry.getAllActionDefinitions());
    }
    if (dataProviderRegistry) {
      setDataProviders(dataProviderRegistry.getAllDefinitions());
    }
    setEvents(EVENT_DEFINITIONS);
  }, [actionRegistry, dataProviderRegistry]);

  const handleSave = useCallback(async () => {
    if (!sequenceManager) {
      console.error("SequenceManager is not initialized.");
      return;
    }
    const flow = { nodes: getNodes(), edges: getEdges() };
    try {
      const result = await sequenceManager.saveOrUpdateSequence(flow, description, capabilities, locks, sequenceToLoad);
      if (result.success) {
        console.log('시퀀스가 성공적으로 저장되었습니다:', result.filePath);
        onClose();
      } else if (result.error) {
        console.error('시퀀스 저장 실패:', result.error);
        alert(`저장 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('시퀀스 저장 중 예외 발생:', error);
      alert(`저장 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [getNodes, getEdges, sequenceManager, sequenceToLoad, onClose, description, capabilities, locks]);

  const handleSaveAs = useCallback(async () => {
    if (!sequenceManager) {
      console.error("SequenceManager is not initialized.");
      return;
    }
    const flow = { nodes: getNodes(), edges: getEdges() };
    try {
      // fileName을 null로 전달하여 '다른 이름으로 저장'을 강제합니다.
      const result = await sequenceManager.saveOrUpdateSequence(flow, description, capabilities, locks, null);
      if (result.success) {
        console.log('시퀀스가 성공적으로 저장되었습니다:', result.filePath);
        onClose();
      } else if (result.error) {
        console.error('시퀀스 저장 실패:', result.error);
        alert(`저장 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('시퀀스 저장 중 예외 발생:', error);
      alert(`저장 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [getNodes, getEdges, sequenceManager, onClose, description, capabilities, locks]);

  const handleLoad = useCallback(async () => {
    try {
      const result = await window.electronAPI.loadSequence();
      if (result.success && result.data) {
        loadSequenceData(result.data);
      } else if (result.error) {
        console.error('시퀀스 불러오기 실패:', result.error);
      }
    } catch (error) {
      console.error('시퀀스 불러오기 중 예외 발생:', error);
    }
  }, [loadSequenceData]);

  const handleRun = useCallback(() => {
    if (!sequenceManager) {
      console.error("SequenceManager is not initialized.");
      return;
    }
    console.log("Running sequence from editor...");
    sequenceManager.runManualFromState(getNodes(), getEdges());
  }, [sequenceManager, getNodes, getEdges]);
  
  const onConnect = useCallback((params: Connection) => {
    const currentNodes = getNodes();
    const sourceNode = currentNodes.find(node => node.id === params.source);
    if (!sourceNode) return;

    const sourceInstance = sourceNode.data as BaseNode;
    const sourcePort = sourceInstance.outputs.find(p => p.name === params.sourceHandle);
    const portType = sourcePort?.type || 'default';
    
    const edgeClassName = (styles as unknown as { [key: string]: string })[EDGE_CLASS_MAP[portType] || EDGE_CLASS_MAP.default];

    const newEdge = {
        ...params,
        className: edgeClassName,
    };

    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges, getNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const reactflowData = event.dataTransfer.getData('application/reactflow');
      if (!reactflowData) return;

      const droppedData = JSON.parse(reactflowData);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNodeId = getId();
      
      let newNode: Node;

      if (droppedData.type === 'manualStartNode') {
        newNode = {
          id: newNodeId,
          type: 'manualStartNode',
          position,
          data: new ManualStartNodeModel(newNodeId),
        };
      } else if (droppedData.type === 'actionNode') {
        const actionDef = actions.find(a => a.name === droppedData.name);
        if (!actionDef) return;
        
        newNode = {
          id: newNodeId,
          type: 'actionNode',
          position,
          data: new ActionNodeModel(newNodeId, actionDef),
        };
      } else if (droppedData.type === 'eventNode') {
        const eventDef = events.find(e => e.name === droppedData.name);
        if (!eventDef) return;

        newNode = {
          id: newNodeId,
          type: 'eventNode',
          position,
          data: new EventNodeModel(newNodeId, eventDef),
        };
      } else if (droppedData.type === 'literalNode') {
        newNode = {
          id: newNodeId,
          type: 'literalNode',
          position,
          data: new LiteralNodeModel(newNodeId),
        };
      } else if (droppedData.type === 'delayNode') {
        newNode = {
          id: newNodeId,
          type: 'delayNode',
          position,
          data: new DelayNodeModel(newNodeId),
        };
      } else if (droppedData.type === 'branchNode') {
        newNode = {
          id: newNodeId,
          type: 'branchNode',
          position,
          data: new BranchNodeModel(newNodeId),
        };
      } else if (droppedData.type === 'operatorNode') {
        newNode = {
          id: newNodeId,
          type: 'operatorNode',
          position,
          data: new OperatorNodeModel(newNodeId, droppedData.category, droppedData.operator),
        };
      } else if (droppedData.type === 'randomNode') {
        newNode = {
          id: newNodeId,
          type: 'randomNode',
          position,
          data: new RandomNodeModel(newNodeId),
        };
      } else if (droppedData.type === 'clockNode') {
        newNode = {
          id: newNodeId,
          type: 'clockNode',
          position,
          data: new ClockNodeModel(newNodeId),
        };
      } else if (droppedData.type === 'numToStrNode') {
        newNode = {
          id: newNodeId,
          type: 'numToStrNode',
          position,
          data: new NumToStrNodeModel(newNodeId),
        };
      } else if (droppedData.type === 'subroutineInputNode') {
        newNode = {
          id: newNodeId,
          type: 'subroutineInputNode',
          position,
          data: new InputNodeModel(newNodeId),
        };
      } else if (droppedData.type === 'callSubroutineNode') {
        newNode = {
          id: newNodeId,
          type: 'callSubroutineNode',
          position,
          data: new CallSubroutineNodeModel(newNodeId),
        };
      } else if (droppedData.type === 'mousePositionNode') {
        newNode = {
          id: newNodeId,
          type: 'mousePositionNode',
          position,
          data: new MousePositionNodeModel(newNodeId),
        };
      } else if (droppedData.type === 'dataProviderNode') {
        const providerDef = dataProviders.find(p => p.name === droppedData.name);
        if (!providerDef) return;

        newNode = {
          id: newNodeId,
          type: 'dataProviderNode',
          position,
          data: new DataProviderNodeModel(newNodeId, providerDef),
        };
      } else {
        return;
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, actions, events, dataProviders],
  );

  const isValidConnection = (connection: Connection) => {
    const currentNodes = getNodes();
    const sourceNode = currentNodes.find(node => node.id === connection.source);
    const targetNode = currentNodes.find(node => node.id === connection.target);
    if (!sourceNode || !targetNode) return false;

    const sourceInstance = sourceNode.data as BaseNode;
    const targetInstance = targetNode.data as BaseNode;
    if (!sourceInstance || !targetInstance) return false;

    const sourcePort = sourceInstance.outputs.find((p: IPort) => p.name === connection.sourceHandle);
    const targetPort = targetInstance.inputs.find((p: IPort) => p.name === connection.targetHandle);

    if (!sourcePort || !targetPort) return false;
    
    // 'any' 타입의 입력 포트는 모든 타입의 출력을 받을 수 있도록 허용
    return targetPort.type === 'any' || sourcePort.type === targetPort.type;
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Sidebar actions={actions} events={events} dataProviders={dataProviders} nodes={nodes} />
      <div 
        className={styles.reactFlowWrapper}
        style={{ flex: 1, height: '100%', position: 'relative' }} 
        ref={reactFlowWrapper}
      >
        {isSubroutine && (
          <div className={styles.descriptionContainer}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="서브루틴의 기능에 대한 자연어 설명을 입력하세요 (LLM이 사용). 예: 캐릭터가 특정 메시지를 말하며 표정을 짓습니다."
              className={styles.descriptionTextarea}
            />
            <div className={styles.metaContainer}>
              <TagInput
                tags={capabilities}
                onChange={setCapabilities}
                placeholder="필요한 Capability를 입력하고 Enter"
              />
              <TagInput
                tags={locks}
                onChange={setLocks}
                placeholder="점유할 Lock을 입력하고 Enter"
              />
            </div>
          </div>
        )}
        <div className={styles.buttonContainer}>
          <button onClick={handleRun} className={`${styles.button} ${styles.buttonRun}`}>실행</button>
          <button onClick={handleSave} className={`${styles.button} ${styles.buttonPrimary}`}>저장</button>
          <button onClick={handleSaveAs} className={`${styles.button} ${styles.buttonPrimary}`}>다른 이름으로 저장</button>
          <button onClick={handleLoad} className={`${styles.button} ${styles.buttonSecondary}`}>불러오기</button>
        </div>
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          deleteKeyCode={['Backspace', 'Delete']}
          panOnDrag={[1, 2]}
          selectionOnDrag={true}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
};

// --- The rest of the file remains the same ---

const FullScreenModal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0, 0, 0, 0.7)', display: 'flex',
        justifyContent: 'center', alignItems: 'center', zIndex: 9999,
        // @ts-ignore
        WebkitAppRegion: 'no-drag',
    }}>
        <div style={{
            width: '90vw', height: '90vh', background: 'rgba(25, 25, 25, 0.98)',
            borderRadius: '10px', color: '#fff', boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            position: 'relative', display: 'flex', flexDirection: 'column', padding: '20px'
        }}>
            <button
                type="button"
                onClick={onClose}
                style={{
                    position: 'absolute', top: '15px', right: '15px', background: 'none',
                    border: 'none', color: '#aaa', fontSize: '1.8rem', cursor: 'pointer',
                    lineHeight: 1, zIndex: 10,
                }}
            >
                ×
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>
                Sequence Editor
            </h2>
            <div style={{ flex: 1, background: '#1E1E1E', borderRadius: '8px', overflow: 'hidden' }}>
                {children}
            </div>
        </div>
    </div>
);

const SequenceEditor: React.FC<SequenceEditorProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <FullScreenModal onClose={props.onClose}>
      <ReactFlowProvider>
        <SequenceEditorComponent sequenceToLoad={props.sequenceToLoad} onClose={props.onClose} />
      </ReactFlowProvider>
    </FullScreenModal>
  );
};

// Need to re-import Sidebar for the main component
import Sidebar from './Sidebar';

export default SequenceEditor;