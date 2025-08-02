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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppContext } from '../../contexts/AppContext';
import { ActionDefinition, ActionParam } from '../../../plugin-api/actions';
import ActionNode from './ActionNode'; // Import the custom node

// Define node types for React Flow
const nodeTypes = {
  actionNode: ActionNode,
};

interface SequenceEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

let id = 0;
const getId = () => `dndnode_${id++}`;

const SequenceEditorComponent: React.FC = () => {
  const { actionRegistry, sequenceEngine } = useAppContext();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition, toObject } = useReactFlow();
  const [actions, setActions] = useState<ActionDefinition[]>([]);

  useEffect(() => {
    if (actionRegistry) {
      setActions(actionRegistry.getAllActionDefinitions());
    }
  }, [actionRegistry]);

  const handleSave = useCallback(async () => {
    const flow = toObject();
    try {
      const result = await window.electronAPI.saveSequence(JSON.stringify(flow, null, 2));
      if (result.success) {
        console.log('시퀀스가 성공적으로 저장되었습니다:', result.filePath);
        // TODO: 사용자에게 성공 피드백 제공
      } else if (!result.canceled) {
        console.error('시퀀스 저장 실패:', result.error);
        // TODO: 사용자에게 오류 피드백 제공
      }
    } catch (error) {
      console.error('시퀀스 저장 중 예외 발생:', error);
    }
  }, [toObject]);

  const handleLoad = useCallback(async () => {
    try {
      const result = await window.electronAPI.loadSequence();
      if (result.success && result.data) {
        const flow = JSON.parse(result.data);
        if (flow && flow.nodes && flow.edges) {
          setNodes(flow.nodes || []);
          setEdges(flow.edges || []);
          console.log('시퀀스를 성공적으로 불러왔습니다.');
          // TODO: 불러온 후 view fit 등 처리
        } else {
           console.error('잘못된 시퀀스 파일 형식입니다.');
        }
      } else if (!result.canceled) {
        console.error('시퀀스 불러오기 실패:', result.error);
      }
    } catch (error) {
      console.error('시퀀스 불러오기 중 예외 발생:', error);
    }
  }, [setNodes, setEdges]);

  const handleRun = useCallback(() => {
    if (!sequenceEngine) {
      console.error("SequenceEngine is not initialized.");
      // TODO: Show error to user
      return;
    }
    console.log("Running sequence from editor...");
    const flow = toObject();
    sequenceEngine.run(flow.nodes, flow.edges);
  }, [sequenceEngine, toObject]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

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
      const actionDef = actions.find(a => a.name === droppedData.name);
      if (!actionDef) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      
      const newNode: Node = {
        id: getId(),
        type: 'actionNode', // Use our custom node type
        position,
        data: { definition: actionDef }, // Pass the full definition to the node
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, actions],
  );

  const isValidConnection = (connection: Connection) => {
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);

    if (!sourceNode || !targetNode) {
      return false;
    }

    const getHandleType = (node: Node, handleId: string | null) => {
      if (handleId === 'exec-in' || handleId === 'exec-out') {
        return 'execution';
      }
      // For data handles, find the corresponding parameter
      const param = node.data.definition?.params.find((p: ActionParam) => p.name === handleId);
      return param ? param.type : null;
    };

    const sourceType = getHandleType(sourceNode, connection.sourceHandle);
    const targetType = getHandleType(targetNode, connection.targetHandle);
    
    console.log(`Connecting ${sourceType} to ${targetType}`);

    return sourceType !== null && sourceType === targetType;
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Sidebar actions={actions} />
      <div style={{ flex: 1, height: '100%', position: 'relative' }} ref={reactFlowWrapper}>
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, display: 'flex', gap: '10px' }}>
          <button onClick={handleRun} className="button-run" style={{background: '#4CAF50', color: 'white'}}>실행</button>
          <button onClick={handleSave} className="button-primary">저장</button>
          <button onClick={handleLoad} className="button-secondary">불러오기</button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          isValidConnection={isValidConnection} // Add the validation logic
          nodeTypes={nodeTypes} // Register the custom node
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
        justifyContent: 'center', alignItems: 'center', zIndex: 900,
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
        <SequenceEditorComponent />
      </ReactFlowProvider>
    </FullScreenModal>
  );
};

// Need to re-import Sidebar for the main component
import Sidebar from './Sidebar';

export default SequenceEditor;