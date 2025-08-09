import { BaseNode, IPort } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";
import { SequenceEngine } from "./SequenceEngine";

export interface SerializedClockNodeData {
    nodeType: 'ClockNodeModel';
    interval: number;
}

export class ClockNodeModel extends BaseNode {
    public interval: number; // Interval in seconds
    private intervalId: NodeJS.Timeout | null = null;

    constructor(id: string, interval: number = 1.0) {
        const inputs: IPort[] = [
             { name: 'interval', type: 'number', direction: 'in' }
        ];
        const outputs: IPort[] = [
            { name: 'exec-out', type: 'execution', direction: 'out' }
        ];

        super(id, 'Clock', inputs, outputs);
        this.interval = interval;
    }

    onActivate(engine: SequenceEngine): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        // To be implemented in SequenceEngine
        const callback = () => {
            console.log(`[ClockNode] Tick! Firing exec-out for node ${this.id}`);
            engine.triggerExecutionFromNode(this.id);
        };

        // TODO: The interval should be configurable via data input port.
        // For now, it uses the serialized value.
        this.intervalId = setInterval(callback, this.interval * 1000);
        console.log(`[ClockNode] Activated: Interval set to ${this.interval}s for node ${this.id}`);
    }

    onDeactivate(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log(`[ClockNode] Deactivated: Interval cleared for node ${this.id}`);
        }
    }

    // The clock node starts execution on its own, so the standard execute path is simple.
    async execute(
        context: PluginContext,
        inputs: { interval?: number }
    ): Promise<{ nextExec?: string; outputs: Record<string, any> }> {
        // If an interval is provided via data input, we could dynamically update the timer.
        // For now, we just pass through. The main logic is in onActivate.
        if (inputs.interval && inputs.interval !== this.interval) {
            this.interval = inputs.interval;
            // Note: This won't restart the timer unless the sequence is reactivated.
            // A more advanced implementation could handle this dynamically.
        }
        
        // This execute function is called when another node triggers it,
        // which is not the primary use case for a clock.
        // We will just pass the execution through.
        return Promise.resolve({ nextExec: 'exec-out', outputs: {} });
    }

    clone(): BaseNode {
        return new ClockNodeModel(this.id, this.interval);
    }

    serialize(): SerializedClockNodeData {
        return {
            nodeType: 'ClockNodeModel',
            interval: this.interval,
        };
    }
}
