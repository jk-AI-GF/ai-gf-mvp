import { Node, Edge } from 'reactflow';
import { PluginContext } from '../../plugin-api/plugin-context';
import { BaseNode } from './BaseNode';
import { ManualStartNodeModel } from './ManualStartNodeModel';
import { ActionNodeModel } from './ActionNodeModel';
import { EventNodeModel } from './EventNodeModel';
import { LiteralNodeModel } from './LiteralNodeModel';
import { DataProviderNodeModel } from './DataProviderNodeModel';

import { OperatorNodeModel } from './OperatorNodeModel';

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

  public async runSubroutine(nodes: Node<BaseNode>[], edges: Edge[], args: Record<string, any>): Promise<void> {
    console.log('[SequenceEngine] Running subroutine...');
    const inputNode = nodes.find(n => n.data.constructor.name === 'InputNodeModel');

    if (!inputNode) {
      console.error('[SequenceEngine] No InputNode found for subroutine run.');
      return;
    }

    await this.executeFrom(inputNode, args, nodes, edges);
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

  private executeFrom(startNode: Node<BaseNode>, initialOutputs: Record<string, any>, sequenceNodes: Node<BaseNode>[], sequenceEdges: Edge[]): Promise<void> {
    return new Promise(async (resolve) => {
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

      const executedDataNodes: Set<string> = new Set();

      const getNodeOutputValue = async (nodeId: string, handleName: string): Promise<any> => {
        const existingValue = executionContext.getValue(nodeId, handleName);
        if (existingValue !== undefined) {
          return existingValue;
        }

        const sourceNode = nodeMap.get(nodeId);
        if (!sourceNode) return undefined;

        // If this node has already been evaluated in this run, don't re-evaluate.
        // This is crucial for data nodes that shouldn't be called multiple times.
        if (executedDataNodes.has(sourceNode.id)) {
          return executionContext.getValue(nodeId, handleName);
        }

        // Check if the node is a data provider or a literal, which don't have exec inputs
        // and should be evaluated on demand (pull).
        if (
          sourceNode.data instanceof DataProviderNodeModel || 
          sourceNode.data instanceof LiteralNodeModel ||
          sourceNode.data instanceof OperatorNodeModel
        ) {
          console.log(`[SequenceEngine] Pull-evaluating data node: ${sourceNode.id} (${sourceNode.data.name})`);
          
          // DataProviderNode and LiteralNode might have inputs in the future, so we calculate them.
          const inputs = await calculateNodeInputs(sourceNode);
          
          let resultOutputs: Record<string, any> = {};
          if (sourceNode.data instanceof DataProviderNodeModel) {
            // DataProviderNode has a specific `evaluate` method
            resultOutputs = await sourceNode.data.evaluate(this.pluginContext);
          } else if (sourceNode.data instanceof LiteralNodeModel || sourceNode.data instanceof OperatorNodeModel) {
            // LiteralNode and OperatorNode use the standard `execute` which just returns its value.
            const result = await sourceNode.data.execute(this.pluginContext, inputs);
            resultOutputs = result.outputs;
          }
          
          if (resultOutputs) {
            for (const outputName in resultOutputs) {
              executionContext.setValue(sourceNode.id, outputName, resultOutputs[outputName]);
            }
          }
          executedDataNodes.add(sourceNode.id);
        }
        
        return executionContext.getValue(nodeId, handleName);
      };

      const calculateNodeInputs = async (node: Node<BaseNode>): Promise<Record<string, any>> => {
        const inputs: Record<string, any> = {};
        const connectedDataEdges = dataEdgesByTarget.get(node.id) || [];

        for (const edge of connectedDataEdges) {
          const sourceValue = await getNodeOutputValue(edge.source, edge.sourceHandle!);
          if (sourceValue !== undefined) {
            // When connecting to an ActionNode, the target handle is the param name.
            // For other nodes, it might be different. This logic holds.
            inputs[edge.targetHandle!] = sourceValue;
          }
        }
        
        // For ActionNodes, we merge the connected inputs with the default values stored in the node.
        if (node.data instanceof ActionNodeModel) {
          // The connected inputs should override the default paramValues.
          return { ...node.data.paramValues, ...inputs };
        }

        // For other node types, we just return the connected inputs.
        return inputs;
      };

      const processNode = async (currentNode: Node<BaseNode>) => {
        // Data-only nodes (like DataProvider or Literal) are evaluated on demand by `getNodeOutputValue`,
        // so we don't "execute" them in the main execution flow.
        if (
          currentNode.data instanceof DataProviderNodeModel || 
          currentNode.data instanceof LiteralNodeModel ||
          currentNode.data instanceof OperatorNodeModel
        ) {
          return;
        }

        let finalInputs = await calculateNodeInputs(currentNode);

        // For the very first node, merge any initial/payload outputs.
        if (currentNode.id === startNode.id) {
          finalInputs = { ...finalInputs, ...initialOutputs };
        }

        console.log(`[SequenceEngine] Executing node: ${currentNode.id} (${currentNode.data.name}) with inputs:`, finalInputs);
        const result = await currentNode.data.execute(this.pluginContext, finalInputs);

        if (result.outputs) {
          for (const outputName in result.outputs) {
            executionContext.setValue(currentNode.id, outputName, result.outputs[outputName]);
          }
        }
        
        if (result.nextExec) {
          const nextExecutionEdges = sequenceEdges.filter(
            e => e.source === currentNode.id && e.sourceHandle === result.nextExec
          );

          const executionPromises = nextExecutionEdges.map(edge => {
            const nextNode = nodeMap.get(edge.target);
            if (nextNode) {
              return processNode(nextNode);
            }
            return Promise.resolve();
          });

          await Promise.all(executionPromises);
        }
      };

      for (const key in initialOutputs) {
        executionContext.setValue(startNode.id, key, initialOutputs[key]);
      }
      
      await processNode(startNode);

      console.log('[SequenceEngine] Execution finished.');
      resolve();
    });
  }
}

