import { Node, Edge } from 'reactflow';
import { PluginContext } from '../../plugin-api/plugin-context';
import { BaseNode } from './BaseNode';
import { ManualStartNodeModel } from './ManualStartNodeModel';
import { EventNodeModel } from './EventNodeModel';

interface ActiveSequence {
  nodes: Node[];
  edges: Edge[];
  listeners: (() => void)[];
}

export class SequenceEngine {
  private pluginContext: PluginContext;
  private nodeMap: Map<string, Node> = new Map();
  private edgeMap: Map<string, Edge[]> = new Map();
  
  // filePath를 키로 사용하여 활성화된 시퀀스와 리스너를 관리합니다.
  private activeSequences: Map<string, ActiveSequence> = new Map();

  constructor(pluginContext: PluginContext) {
    if (!pluginContext) {
      throw new Error("SequenceEngine requires a valid PluginContext.");
    }
    this.pluginContext = pluginContext;
  }

  /**
   * 특정 시퀀스를 활성화하고 이벤트 리스너를 등록합니다.
   * @param sequenceId 고유한 시퀀스 식별자 (예: 파일 경로)
   * @param nodes 시퀀스의 노드
   * @param edges 시퀀스의 엣지
   */
  public activateSequence(sequenceId: string, nodes: Node[], edges: Edge[]): void {
    if (this.activeSequences.has(sequenceId)) {
      console.warn(`[SequenceEngine] Sequence '${sequenceId}' is already active. Deactivating before reactivating.`);
      this.deactivateSequence(sequenceId);
    }

    this.buildMaps(nodes, edges); // 임시로 전체 맵을 사용. 개별 맵으로 변경 필요
    const eventNodes = nodes.filter(n => n.data instanceof EventNodeModel);
    const newListeners: (() => void)[] = [];

    console.log(`[SequenceEngine] Activating sequence '${sequenceId}' with ${eventNodes.length} event node(s).`);

    eventNodes.forEach(node => {
      const eventModel = node.data as EventNodeModel;
      const unsubscribe = this.pluginContext.eventBus.on(eventModel.eventName as any, (payload: any) => {
        console.log(`[SequenceEngine] Event '${eventModel.eventName}' triggered for sequence '${sequenceId}'.`);
        this.executeFrom(node, payload, nodes, edges);
      });
      newListeners.push(unsubscribe);
    });

    this.activeSequences.set(sequenceId, { nodes, edges, listeners: newListeners });
  }

  /**
   * 특정 시퀀스를 비활성화하고 이벤트 리스너를 해제합니다.
   * @param sequenceId 비활성화할 시퀀스의 식별자
   */
  public deactivateSequence(sequenceId: string): void {
    const sequence = this.activeSequences.get(sequenceId);
    if (sequence) {
      console.log(`[SequenceEngine] Deactivating sequence '${sequenceId}'.`);
      sequence.listeners.forEach(unsubscribe => unsubscribe());
      this.activeSequences.delete(sequenceId);
    }
  }

  /**
   * Manually runs a sequence from all ManualStartNodes.
   * This is typically used for testing in the editor.
   * @param nodes The nodes of the sequence graph.
   * @param edges The edges of the sequence graph.
   */
  public async runManual(nodes: Node[], edges: Edge[]): Promise<void> {
    console.log('[SequenceEngine] Running sequence manually...');
    this.buildMaps(nodes, edges);

    const startNodes = nodes.filter(n => n.data instanceof ManualStartNodeModel);

    if (startNodes.length === 0) {
      console.warn('[SequenceEngine] No ManualStartNode found for manual run.');
      return;
    }

    await Promise.all(startNodes.map(startNode => this.executeFrom(startNode, {}, nodes, edges)));
  }

  private buildMaps(nodes: Node[], edges: Edge[]) {
    this.nodeMap.clear();
    this.edgeMap.clear();
    nodes.forEach(n => this.nodeMap.set(n.id, n));
    edges.forEach(e => {
      if (!this.edgeMap.has(e.source)) {
        this.edgeMap.set(e.source, []);
      }
      this.edgeMap.get(e.source)!.push(e);
    });
  }

  private async executeFrom(startNode: Node, initialOutputs: Record<string, any>, sequenceNodes: Node[], sequenceEdges: Edge[]): Promise<void> {
    // 실행 시점의 맵을 해당 시퀀스의 노드/엣지로만 구성
    const localNodeMap = new Map(sequenceNodes.map(n => [n.id, n]));
    const localEdgeMap: Map<string, Edge[]> = new Map();
    sequenceEdges.forEach(e => {
      if (!localEdgeMap.has(e.source)) {
        localEdgeMap.set(e.source, []);
      }
      localEdgeMap.get(e.source)!.push(e);
    });


    const executeNode = async (currentNode: Node, currentInputs: Record<string, any>) => {
      const nodeInstance = currentNode.data as BaseNode;
      if (!nodeInstance || typeof nodeInstance.execute !== 'function') {
        console.error(`Node ${currentNode.id} does not have a valid BaseNode instance.`);
        return;
      }

      console.log(`Executing node: ${currentNode.id} (${nodeInstance.name})`);

      const result = await nodeInstance.execute(this.pluginContext, currentInputs);

      if (result.nextExec) {
        const nextEdge = localEdgeMap.get(currentNode.id)?.find(e => e.sourceHandle === result.nextExec);
        if (nextEdge) {
          const nextNode = localNodeMap.get(nextEdge.target);
          if (nextNode) {
            await executeNode(nextNode, result.outputs);
          }
        }
      }
    };

    await executeNode(startNode, initialOutputs);
  }
}

