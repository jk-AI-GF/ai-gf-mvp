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

import ClockNode from './ClockNode';
import NumToStrNode from './NumToStrNode';

import { BaseNode, IPort } from '../../../core/sequence/BaseNode';
import { EVENT_DEFINITIONS, EventDefinition } from '../../../core/event-definitions';
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
  const { actionRegistry, sequenceManager } = useAppContext();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition, getNodes, getEdges, fitView } = useReactFlow();
  const [actions, setActions] = useState<ActionDefinition[]>([]);
  const [events, setEvents] = useState<EventDefinition[]>([]);

  const loadSequenceData = useCallback((sequenceJsonString: string) => {
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

    const { nodes: newNodes, edges: rawEdges } = sequenceManager.deserializeSequence(serializedSequence);

    const styledEdges = rawEdges.map(edge => {
      const sourceNode = newNodes.find(node => node.id === edge.source);
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
  }, [setNodes, setEdges, sequenceManager, fitView]);

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
    setEvents(EVENT_DEFINITIONS);
  }, [actionRegistry]);

  const handleSave = useCallback(async () => {
    if (!sequenceManager) {
      console.error("SequenceManager is not initialized.");
      return;
    }
    const currentNodes = getNodes();
    const currentEdges = getEdges();

    const flow = { nodes: currentNodes, edges: currentEdges };
    let result;

    try {
      if (sequenceToLoad) {
        result = await sequenceManager.saveSequenceToFile(sequenceToLoad, flow);
      } else {
        const serializableData = sequenceManager.serializeSequence(flow);
        const jsonString = JSON.stringify(serializableData, null, 2);
        result = await window.electronAPI.saveSequence(jsonString);
      }

      if (result.success) {
        console.log('시퀀스가 성공적으로 저장되었습니다:', result.filePath);
        eventBus.emit('sequences-updated');
        onClose();
      } else if (result.error) {
        console.error('시퀀스 저장 실패:', result.error);
        alert(`저장 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('시퀀스 저장 중 예외 발생:', error);
      alert(`저장 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [getNodes, getEdges, sequenceManager, sequenceToLoad, onClose]);

  const handleSaveAs = useCallback(async () => {
    if (!sequenceManager) {
      console.error("SequenceManager is not initialized.");
      return;
    }
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const flow = { nodes: currentNodes, edges: currentEdges };
    
    try {
      const serializableData = sequenceManager.serializeSequence(flow);
      const jsonString = JSON.stringify(serializableData, null, 2);
      const result = await window.electronAPI.saveSequence(jsonString);

      if (result.success) {
        console.log('시퀀스가 성공적으로 저장되었습니다:', result.filePath);
        eventBus.emit('sequences-updated');
        onClose();
      } else if (result.error) {
        console.error('시퀀스 저장 실패:', result.error);
        alert(`저장 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('시퀀스 저장 중 예외 발생:', error);
      alert(`저장 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [getNodes, getEdges, sequenceManager, onClose]);

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
      } else {
        return;
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, actions, events],
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
      <Sidebar actions={actions} events={events} />
      <div 
        className={styles.reactFlowWrapper}
        style={{ flex: 1, height: '100%', position: 'relative' }} 
        ref={reactFlowWrapper}
      >
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