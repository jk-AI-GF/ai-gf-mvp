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

    this.activeSequences.set(sequenceId, { nodes, edges, listeners: newListeners });
  }

  public deactivateSequence(sequenceId: string): void {
    const sequence = this.activeSequences.get(sequenceId);
    if (sequence) {
      console.log(`[SequenceEngine] Deactivating sequence '${sequenceId}'.`);
      sequence.listeners.forEach(unsubscribe => unsubscribe());
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

  private async executeFrom(startNode: Node<BaseNode>, initialOutputs: Record<string, any>, sequenceNodes: Node<BaseNode>[], sequenceEdges: Edge[]): Promise<void> {
    const executionContext = new ExecutionContext();
    const nodeMap = new Map(sequenceNodes.map(n => [n.id, n]));
    
    // 데이터 엣지만 따로 맵으로 만들어 입력 값 계산 시 사용
    const dataEdgesByTarget: Map<string, Edge[]> = new Map();
    sequenceEdges.forEach(edge => {
      if (edge.targetHandle && edge.targetHandle !== 'exec-in') {
        const edges = dataEdgesByTarget.get(edge.target) || [];
        edges.push(edge);
        dataEdgesByTarget.set(edge.target, edges);
      }
    });

    // 데이터 전용 노드(예: LiteralNode)를 미리 실행하여 컨텍스트에 값을 채웁니다.
    for (const node of sequenceNodes) {
      if (node.data instanceof LiteralNodeModel) {
        const result = await node.data.execute(this.pluginContext, {});
        if (result.outputs) {
          for (const outputName in result.outputs) {
            executionContext.setValue(node.id, outputName, result.outputs[outputName]);
          }
        }
      }
    }

    // 실행 큐: 다음에 실행할 노드를 관리
    const executionQueue: Node<BaseNode>[] = [startNode];
    
    // 초기값(이벤트 페이로드 등)을 컨텍스트에 저장
    for (const key in initialOutputs) {
      executionContext.setValue(startNode.id, key, initialOutputs[key]);
    }

    while (executionQueue.length > 0) {
      const currentNode = executionQueue.shift()!;
      const nodeInstance = currentNode.data;

      // 1. 입력 데이터 계산
      const dataInputs: Record<string, any> = {};
      const connectedDataEdges = dataEdgesByTarget.get(currentNode.id) || [];
      
      for (const edge of connectedDataEdges) {
        const sourceValue = executionContext.getValue(edge.source, edge.sourceHandle!);
        if (sourceValue !== undefined) {
          dataInputs[edge.targetHandle!] = sourceValue;
        }
      }

      // 내장 파라미터 값과 연결된 입력 값을 병합합니다.
      // 연결된 값(dataInputs)이 내장 값보다 우선순위가 높습니다.
      let finalInputs = dataInputs;
      if (nodeInstance instanceof ActionNodeModel) {
        finalInputs = { ...nodeInstance.paramValues, ...dataInputs };
      }

      // 2. 노드 실행
      console.log(`[SequenceEngine] Executing node: ${currentNode.id} (${nodeInstance.name}) with inputs:`, finalInputs);
      const result = await nodeInstance.execute(this.pluginContext, finalInputs);

      // 3. 출력 데이터 저장
      if (result.outputs) {
        for (const outputName in result.outputs) {
          executionContext.setValue(currentNode.id, outputName, result.outputs[outputName]);
        }
      }

      // 4. 다음 실행 노드 큐에 추가
      if (result.nextExec) {
        const nextExecutionEdge = sequenceEdges.find(
          e => e.source === currentNode.id && e.sourceHandle === result.nextExec
        );

        if (nextExecutionEdge) {
          const nextNode = nodeMap.get(nextExecutionEdge.target);
          if (nextNode) {
            executionQueue.push(nextNode);
          }
        }
      }
    }
    console.log('[SequenceEngine] Execution finished.');
  }
}

