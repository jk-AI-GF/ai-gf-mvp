import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";
import { SubroutineParameter } from "./InputNodeModel";

export interface SerializedCallSubroutineNodeData {
  nodeType: 'CallSubroutineNodeModel';
  subroutineId: string | null;
  // Note: We don't store parameters here, they are fetched dynamically
}

/**
 * A node that calls a subroutine.
 * Its ports dynamically update based on the selected subroutine's parameters.
 */
export class CallSubroutineNodeModel extends BaseNode {
  private _subroutineId: string | null = null;
  private _subroutineParameters: SubroutineParameter[] = [];

  constructor(id: string, subroutineId: string | null = null) {
    // Initial ports are minimal. They will be updated.
    const inputs: IPort[] = [{ name: 'exec-in', type: 'execution', direction: 'in' }];
    const outputs: IPort[] = [{ name: 'exec-out', type: 'execution', direction: 'out' }];
    
    super(id, "Call Subroutine", inputs, outputs);
    this._subroutineId = subroutineId;
  }

  get subroutineId(): string | null {
    return this._subroutineId;
  }

  /**
   * Updates the node's ports based on the parameters of the selected subroutine.
   * This method should be called from the UI when a subroutine is selected.
   * @param subroutineId The file name of the selected subroutine.
   * @param parameters The parameters of the selected subroutine.
   */
  public setSubroutine(subroutineId: string, parameters: SubroutineParameter[]) {
    this._subroutineId = subroutineId;
    this._subroutineParameters = parameters;
    this.updatePorts();
  }

  private updatePorts() {
    const newInputs: IPort[] = [{ name: 'exec-in', type: 'execution', direction: 'in' }];
    
    this._subroutineParameters.forEach(param => {
      newInputs.push({
        name: param.name, // Use parameter name for the port
        type: param.type,
        direction: 'in',
      });
    });

    this.inputs = newInputs;
    // Outputs remain constant: just one execution output
    this.outputs = [{ name: 'exec-out', type: 'execution', direction: 'out' }];
  }

  async execute(
    context: PluginContext,
    inputs: Record<string, any>
  ): Promise<{ nextExec?: string; outputs: Record<string, any> }> {
    if (!this._subroutineId) {
      console.error(`[CallSubroutineNode] No subroutine selected for node ${this.id}`);
      return { nextExec: 'exec-out', outputs: {} };
    }

    // The 'inputs' object from the engine contains values for our data ports.
    // The keys of the 'inputs' object are the port names, which we made from the parameter names.
    // This is exactly the format `runSubroutine` expects for its 'args'.
    const { 'exec-in': _, ...args } = inputs; // Remove exec-in property

    console.log(`[CallSubroutineNode] Calling subroutine '${this._subroutineId}' with args:`, args);
    
    // We need access to SequenceManager to run the subroutine.
    // This is a dependency that needs to be provided via the PluginContext.
    if (context.sequenceManager) {
      await context.sequenceManager.runSubroutine(this._subroutineId, args);
    } else {
      console.error("[CallSubroutineNode] SequenceManager is not available in PluginContext!");
    }

    return { nextExec: 'exec-out', outputs: {} };
  }

  clone(): BaseNode {
    const clone = new CallSubroutineNodeModel(this.id, this._subroutineId);
    // Important: The parameters are not part of the constructor, so we set them manually.
    clone.setSubroutine(this._subroutineId!, [...this._subroutineParameters]);
    return clone;
  }

  serialize(): SerializedCallSubroutineNodeData {
    return {
      nodeType: 'CallSubroutineNodeModel',
      subroutineId: this._subroutineId,
    };
  }
}
