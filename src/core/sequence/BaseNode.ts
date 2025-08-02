import { Node } from 'reactflow';

export interface NodeExecutionContext {
  // This context will be passed to each node during execution.
  // It will contain access to system APIs like actions, contextStore, etc.
  // For now, it's a placeholder.
  actions: any; // Replace with actual actions interface
  getContext: (key: string) => any;
  setContext: (key: string, value: any) => void;
}

export abstract class BaseNode {
  id: string;
  type: string;
  data: any;

  constructor(node: Node) {
    this.id = node.id;
    this.type = node.type;
    this.data = node.data;
  }

  // Abstract method to be implemented by all concrete node types.
  public abstract execute(context: NodeExecutionContext): Promise<void | string>; // Returns next node ID or void
}
