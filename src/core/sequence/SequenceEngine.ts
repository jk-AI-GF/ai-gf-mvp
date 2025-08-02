import { Node, Edge } from 'reactflow';
import { PluginContext } from '../../plugin-api/plugin-context';
import { BaseNode } from './BaseNode';
import { ManualStartNodeModel } from './ManualStartNodeModel';
import { EventNodeModel } from './EventNodeModel';

export class SequenceEngine {
  private pluginContext: PluginContext;
  private nodeMap: Map<string, Node> = new Map();
  private edgeMap: Map<string, Edge[]> = new Map();
  private activeListeners: (() => void)[] = []; // To store unsubscribe functions

  constructor(pluginContext: PluginContext) {
    if (!pluginContext) {
      throw new Error("SequenceEngine requires a valid PluginContext.");
    }
    this.pluginContext = pluginContext;
  }

  /**
   * Clears all active event listeners.
   */
  private clearListeners() {
    this.activeListeners.forEach(unsubscribe => unsubscribe());
    this.activeListeners = [];
  }

  /**
   * Sets up event listeners for all event nodes in the graph.
   * This should be called whenever a new sequence is loaded.
   * @param nodes The nodes of the sequence graph.
   * @param edges The edges of the sequence graph.
   */
  public setup(nodes: Node[], edges: Edge[]): void {
    this.clearListeners();
    this.buildMaps(nodes, edges);

    const eventNodes = nodes.filter(n => n.data instanceof EventNodeModel);

    console.log(`[SequenceEngine] Setting up ${eventNodes.length} event node(s).`);

    eventNodes.forEach(node => {
      const eventModel = node.data as EventNodeModel;
      const unsubscribe = this.pluginContext.eventBus.on(eventModel.eventName as any, (payload: any) => {
        console.log(`[SequenceEngine] Event '${eventModel.eventName}' triggered.`);
        // Pass the event payload as the initial set of outputs for the event node
        this.executeFrom(node, payload);
      });
      this.activeListeners.push(unsubscribe);
    });
  }

  /**
   * Manually runs the sequence from all ManualStartNodes.
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

    await Promise.all(startNodes.map(startNode => this.executeFrom(startNode, {})));
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

  private async executeFrom(node: Node, initialOutputs: Record<string, any>): Promise<void> {
    const nodeInstance = node.data as BaseNode;
    if (!nodeInstance || typeof nodeInstance.execute !== 'function') {
      console.error(`Node ${node.id} does not have a valid BaseNode instance.`);
      return;
    }

    console.log(`Executing node: ${node.id} (${nodeInstance.name})`);

    // For EventNode, the initialOutputs from the event payload are passed directly.
    // For other nodes, this will be an empty object.
    const result = await nodeInstance.execute(this.pluginContext, initialOutputs);

    if (result.nextExec) {
      const nextEdge = this.edgeMap.get(node.id)?.find(e => e.sourceHandle === result.nextExec);
      if (nextEdge) {
        const nextNode = this.nodeMap.get(nextEdge.target);
        if (nextNode) {
          // The outputs of the current node become the inputs for the next.
          // This is a simplified data flow model.
          await this.executeFrom(nextNode, result.outputs);
        }
      }
    }
  }
}

