import { Node, Edge } from 'reactflow';
import { PluginContext } from '../../plugin-api/plugin-context';
import { BaseNode } from './BaseNode';
import { ManualStartNodeModel } from './ManualStartNodeModel';

/**
 * 시퀀스 그래프를 실행하는 리팩토링된 엔진입니다.
 * 이제 노드의 'type' 대신, 노드 데이터에 포함된 BaseNode 인스턴스의 execute() 메서드를 호출합니다.
 */
export class SequenceEngine {
  private pluginContext: PluginContext;
  private nodeMap: Map<string, Node> = new Map();
  private edgeMap: Map<string, Edge[]> = new Map(); // key: sourceNodeId

  constructor(pluginContext: PluginContext) {
    if (!pluginContext) {
      throw new Error("SequenceEngine requires a valid PluginContext.");
    }
    this.pluginContext = pluginContext;
  }

  /**
   * 시퀀스 실행을 시작합니다.
   * @param nodes 그래프의 모든 노드
   * @param edges 그래프의 모든 엣지
   */
  public async run(nodes: Node[], edges: Edge[]): Promise<void> {
    console.log('Running sequence with refactored engine...');
    this.buildMaps(nodes, edges);

    const startNodes = nodes.filter(n => n.data instanceof ManualStartNodeModel);

    if (startNodes.length === 0) {
      console.error('SequenceEngine: No ManualStartNode found.');
      return;
    }

    console.log(`Found ${startNodes.length} start node(s).`);
    
    // 모든 시작 노드로부터 병렬로 실행을 시작합니다.
    await Promise.all(startNodes.map(startNode => this.executeFrom(startNode)));

    console.log('All parallel sequence executions initiated.');
  }

  /**
   * 노드와 엣지를 쉽게 찾을 수 있도록 맵을 빌드합니다.
   */
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

  /**
   * 특정 노드부터 실행을 시작하고, 실행 흐름을 따라 재귀적으로 다음 노드를 실행합니다.
   * @param node 실행을 시작할 노드
   */
  private async executeFrom(node: Node): Promise<void> {
    const nodeInstance = node.data as BaseNode;
    if (!nodeInstance || typeof nodeInstance.execute !== 'function') {
        console.error(`Node ${node.id} does not have a valid BaseNode instance.`);
        return;
    }

    console.log(`Executing node: ${node.id} (${nodeInstance.name})`);

    // 데이터 흐름 구현 (1단계): 연결된 값 계산
    // TODO: 이 로직은 재귀 호출과 순환 참조를 처리할 수 있도록 더 정교해져야 합니다.
    const connectedInputs: Record<string, any> = {};
    const inputEdges = Array.from(this.edgeMap.values()).flat().filter(e => e.target === node.id);

    for (const edge of inputEdges) {
        const sourceNode = this.nodeMap.get(edge.source);
        const sourceInstance = sourceNode?.data as BaseNode;
        if (sourceInstance && edge.targetHandle) {
            // 여기서 실제로는 sourceNode를 먼저 실행하고 그 결과(outputs)를 받아와야 하지만,
            // 지금은 데이터 흐름을 완전히 구현하지 않았으므로 일단 개념만 남겨둡니다.
            // connectedInputs[edge.targetHandle] = await this.getValueFromOutput(sourceNode, edge.sourceHandle);
        }
    }

    // BaseNode의 execute를 호출합니다.
    // 모델 내에서 연결된 값과 내장된 값을 합치는 로직이 처리됩니다.
    const result = await nodeInstance.execute(this.pluginContext, connectedInputs);

    // execute 결과에 따라 다음 실행 노드를 찾아 재귀 호출합니다.
    if (result.nextExec) {
      const nextEdge = this.edgeMap.get(node.id)?.find(e => e.sourceHandle === result.nextExec);
      if (nextEdge) {
        const nextNode = this.nodeMap.get(nextEdge.target);
        if (nextNode) {
          await this.executeFrom(nextNode);
        }
      }
    }
  }
}

