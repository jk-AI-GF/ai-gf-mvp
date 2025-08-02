import { Node, Edge } from 'reactflow';
import { PluginContext } from '../../plugin-api/plugin-context';

/**
 * Executes a sequence of nodes based on the graph data.
 * This engine lives in the renderer process and directly interacts with the PluginContext.
 */
export class SequenceEngine {
  private pluginContext: PluginContext;

  constructor(pluginContext: PluginContext) {
    if (!pluginContext) {
      throw new Error("SequenceEngine requires a valid PluginContext.");
    }
    this.pluginContext = pluginContext;
  }

  /**
   * Runs the entire sequence from a starting node.
   * @param nodes The list of nodes in the graph.
   * @param edges The list of edges connecting the nodes.
   */
  public async run(nodes: Node[], edges: Edge[]): Promise<void> {
    console.log('Running sequence...');

    // Naive start node detection: find the first node that has an 'exec-out' 
    // handle but no 'exec-in' handle connected.
    // This should be replaced with a dedicated 'EventNode' system later.
    const startNode = nodes.find(n => {
      const hasExecIn = edges.some(e => e.target === n.id && e.targetHandle === 'exec-in');
      const hasExecOut = edges.some(e => e.source === n.id && e.sourceHandle === 'exec-out');
      return hasExecOut && !hasExecIn;
    });

    if (!startNode) {
      console.error('SequenceEngine: No start node found. A sequence must have a node with an outgoing execution flow that is not triggered by another node.');
      // TODO: Provide user feedback in the UI.
      return;
    }

    console.log('Starting execution from node:', startNode.id);
    await this.executeFrom(startNode, nodes, edges);
  }

  /**
   * Executes a node and then traverses to the next one.
   * @param node The node to execute.
   * @param nodes The full list of nodes.
   * @param edges The full list of edges.
   */
  private async executeFrom(node: Node, nodes: Node[], edges: Edge[]): Promise<void> {
    console.log(`Executing node: ${node.id} (Type: ${node.type})`);

    // TODO: Add visual feedback (highlighting) via an event bus.

    switch (node.type) {
      case 'actionNode':
        await this.executeActionNode(node, nodes, edges);
        break;
      // TODO: Implement other node types like 'BranchNode', 'DelayNode', etc.
      default:
        console.warn(`SequenceEngine: Unknown or unsupported node type "${node.type}"`);
        break;
    }

    // Find the next node connected via the 'exec-out' handle.
    const nextEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'exec-out');
    if (nextEdge) {
      const nextNode = nodes.find(n => n.id === nextEdge.target);
      if (nextNode) {
        await this.executeFrom(nextNode, nodes, edges);
      }
    } else {
      console.log('Sequence execution finished.');
    }
  }

  /**
   * Executes the logic for an 'actionNode'.
   * @param node The action node.
   */
  private async executeActionNode(node: Node, nodes: Node[], edges: Edge[]): Promise<void> {
    const { definition, params: nodeParams } = node.data;
    if (!definition) {
      console.error(`ActionNode ${node.id} is missing its definition.`);
      return;
    }

    const actionName = definition.name;
    const action = (this.pluginContext.actions as any)[actionName];

    if (typeof action !== 'function') {
      console.error(`Action "${actionName}" not found in PluginContext.`);
      return;
    }

    // TODO: Implement full data flow.
    // For now, we are not resolving input parameters from other nodes.
    // We'll just use the values stored directly on the node's data.
    const executionParams = nodeParams || {};

    console.log(`Executing action: ${actionName} with params:`, executionParams);
    try {
      // The action function in pluginContext might be expecting the context as the first argument.
      // However, the proxy in mod-loader forwards it as a simple function call.
      // Let's assume the actions available to the sequence engine don't need the context passed this way.
      await action(executionParams);
    } catch (error) {
      console.error(`Error executing action "${actionName}" on node ${node.id}:`, error);
    }
  }
}
