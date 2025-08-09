import { Node, Edge } from 'reactflow';
import { PluginContext } from '../../plugin-api/plugin-context';
import { BaseNode } from './BaseNode';
import { ManualStartNodeModel } from './ManualStartNodeModel';
import { ActionNodeModel } from './ActionNodeModel';
import { EventNodeModel } from './EventNodeModel';
import { LiteralNodeModel } from './LiteralNodeModel';

interface ActiveSequence {
  nodes: Node<BaseNode>[];
  edges: Edge[];
  listeners: (() => void)[];
}

/**
 * 시퀀스 실행의 단일 인스턴스에 대한 컨텍스트를 관리합니다.
 * 노드 간 데이터 흐름을 위해 모든 노드의 출력 값을 저장합니다.
 */
class ExecutionContext {
  // 키: `${nodeId}-${outputHandleName}`, 값: 실제 데이터
  private outputValues: Map<string, any> = new Map();

  setValue(nodeId: string, handleName: string, value: any): void {
    const key = `${nodeId}-${handleName}`;
    this.outputValues.set(key, value);
    console.log(`[ExecutionContext] Set value for ${key}:`, value);
  }

  getValue(nodeId: string, handleName: string): any {
    const key = `${nodeId}-${handleName}`;
    if (!this.outputValues.has(key)) {
      // console.warn(`[ExecutionContext] Value for ${key} not found.`);
      return undefined;
    }
    return this.outputValues.get(key);
  }
}


export class SequenceEngine {
  private pluginContext: PluginContext;
  
  // filePath를 키로 사용하여 활성화된 시퀀스와 리스너를 관리합니다.
  private activeSequences: Map<string, ActiveSequence> = new Map();

  constructor(pluginContext: PluginContext) {
    if (!pluginContext) {
      throw new Error("SequenceEngine requires a valid PluginContext.");
    }
    this.pluginContext = pluginContext;
  }

  public activateSequence(sequenceId: string, nodes: Node<BaseNode>[], edges: Edge[]): void {
    if (this.activeSequences.has(sequenceId)) {
      this.deactivateSequence(sequenceId);
    }

    const eventNodes = nodes.filter(n => n.data instanceof EventNodeModel);
    const newListeners: (() => void)[] = [];

    console.log(`[SequenceEngine] Activating sequence '${sequenceId}' with ${eventNodes.length} event node(s).`);

    eventNodes.forEach(node => {
      const eventModel = node.data as EventNodeModel;
      const unsubscribe = this.pluginContext.eventBus.on(eventModel.eventName as any, (payload: any) => {
        console.log(`[SequenceEngine] Event '${eventModel.eventName}' triggered for sequence '${sequenceId}'.`);
        // 이벤트가 발생하면, 페이로드와 함께 새로운 실행을 시작합니다.
        this.executeFrom(node, payload, nodes, edges);
      });
      newListeners.push(unsubscribe);
    });

    // Call onActivate for all nodes that have it
    nodes.forEach(node => {
      if (node.data.onActivate) {
        node.data.onActivate(this);
      }
    });

    this.activeSequences.set(sequenceId, { nodes, edges, listeners: newListeners });
  }

  public deactivateSequence(sequenceId: string): void {
    const sequence = this.activeSequences.get(sequenceId);
    if (sequence) {
      console.log(`[SequenceEngine] Deactivating sequence '${sequenceId}'.`);
      sequence.listeners.forEach(unsubscribe => unsubscribe());

      // Call onDeactivate for all nodes that have it
      sequence.nodes.forEach(node => {
        if (node.data.onDeactivate) {
          node.data.onDeactivate();
        }
      });

      this.activeSequences.delete(sequenceId);
    }
  }

  public async runManual(nodes: Node<BaseNode>[], edges: Edge[]): Promise<void> {
    console.log('[SequenceEngine] Running sequence manually...');
    const startNodes = nodes.filter(n => n.data instanceof ManualStartNodeModel);

    if (startNodes.length === 0) {
      console.warn('[SequenceEngine] No ManualStartNode found for manual run.');
      return;
    }

    await Promise.all(startNodes.map(startNode => this.executeFrom(startNode, {}, nodes, edges)));
  }

  public triggerExecutionFromNode(nodeId: string): void {
    // Find the active sequence that contains this node
    for (const [sequenceId, sequence] of this.activeSequences.entries()) {
      const node = sequence.nodes.find(n => n.id === nodeId);
      if (node) {
        console.log(`[SequenceEngine] Triggering execution from node ${nodeId} in sequence ${sequenceId}`);
        this.executeFrom(node, {}, sequence.nodes, sequence.edges);
        return;
      }
    }
    console.warn(`[SequenceEngine] Could not trigger execution. Node ${nodeId} not found in any active sequence.`);
  }

  private async executeFrom(startNode: Node<BaseNode>, initialOutputs: Record<string, any>, sequenceNodes: Node<BaseNode>[], sequenceEdges: Edge[]): Promise<void> {
    const executionContext = new ExecutionContext();
    const nodeMap = new Map(sequenceNodes.map(n => [n.id, n]));
    
    const dataEdgesByTarget: Map<string, Edge[]> = new Map();
    sequenceEdges.forEach(edge => {
      if (edge.targetHandle && !edge.targetHandle.startsWith('exec-')) {
        const edges = dataEdgesByTarget.get(edge.target) || [];
        edges.push(edge);
        dataEdgesByTarget.set(edge.target, edges);
      }
    });

    // 이미 실행된 노드를 추적하여 무한 루프와 중복 실행을 방지합니다.
    const executedDataNodes: Set<string> = new Set();

    /**
     * 특정 노드의 특정 출력 핸들에서 나오는 값을 재귀적으로 계산하고 반환합니다.
     * 만약 값이 컨텍스트에 없다면, 해당 값을 생성하는 소스 노드를 찾아 실행합니다.
     */
    const getNodeOutputValue = async (nodeId: string, handleName: string): Promise<any> => {
      // 1. 컨텍스트에 값이 이미 있는지 확인
      const existingValue = executionContext.getValue(nodeId, handleName);
      if (existingValue !== undefined) {
        return existingValue;
      }

      const sourceNode = nodeMap.get(nodeId);
      if (!sourceNode) return undefined;

      // 2. 데이터 전용 노드이고 아직 실행되지 않았다면 실행
      const hasExecIn = sourceNode.data.inputs.some(p => p.type === 'execution');
      if (!hasExecIn && !executedDataNodes.has(sourceNode.id)) {
        console.log(`[SequenceEngine] Pull-executing data node: ${sourceNode.id} (${sourceNode.data.name})`);
        
        // 3. 이 노드의 입력 값을 재귀적으로 먼저 계산
        const inputs = await calculateNodeInputs(sourceNode);
        
        // 4. 노드 실행 및 출력 저장
        const result = await sourceNode.data.execute(this.pluginContext, inputs);
        if (result.outputs) {
          for (const outputName in result.outputs) {
            executionContext.setValue(sourceNode.id, outputName, result.outputs[outputName]);
          }
        }
        executedDataNodes.add(sourceNode.id);
      }
      
      // 5. 이제 값이 컨텍스트에 있을 것이므로 다시 조회하여 반환
      return executionContext.getValue(nodeId, handleName);
    };

    /**
     * 특정 노드의 모든 입력 값을 계산하여 맵으로 반환합니다.
     */
    const calculateNodeInputs = async (node: Node<BaseNode>): Promise<Record<string, any>> => {
      const inputs: Record<string, any> = {};
      const connectedDataEdges = dataEdgesByTarget.get(node.id) || [];

      for (const edge of connectedDataEdges) {
        const sourceValue = await getNodeOutputValue(edge.source, edge.sourceHandle!);
        if (sourceValue !== undefined) {
          inputs[edge.targetHandle!] = sourceValue;
        }
      }
      
      // paramValues와 연결된 입력을 병합 (연결된 값이 우선)
      if (node.data instanceof ActionNodeModel) {
        return { ...node.data.paramValues, ...inputs };
      }
      return inputs;
    };

    // 실행 큐 및 초기화
    const executionQueue: Node<BaseNode>[] = [startNode];
    for (const key in initialOutputs) {
      executionContext.setValue(startNode.id, key, initialOutputs[key]);
    }

    // 메인 실행 루프
    while (executionQueue.length > 0) {
      const currentNode = executionQueue.shift()!;
      
      // 1. 현재 노드의 입력 계산 (데이터 종속성 해결)
      const finalInputs = await calculateNodeInputs(currentNode);

      // 2. 노드 실행
      console.log(`[SequenceEngine] Executing node: ${currentNode.id} (${currentNode.data.name}) with inputs:`, finalInputs);
      const result = await currentNode.data.execute(this.pluginContext, finalInputs);

      // 3. 출력 데이터 저장
      if (result.outputs) {
        for (const outputName in result.outputs) {
          executionContext.setValue(currentNode.id, outputName, result.outputs[outputName]);
        }
      }

      // 4. 다음 실행 노드 큐에 추가
      if (result.nextExec) {
        const nextExecutionEdges = sequenceEdges.filter(
          e => e.source === currentNode.id && e.sourceHandle === result.nextExec
        );

        for (const edge of nextExecutionEdges) {
          const nextNode = nodeMap.get(edge.target);
          if (nextNode) {
            executionQueue.push(nextNode);
          }
        }
      }
    }
    console.log('[SequenceEngine] Execution finished.');
  }
}

