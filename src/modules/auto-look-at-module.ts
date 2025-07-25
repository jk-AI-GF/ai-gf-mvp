import { Imodule } from './module-manager';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { ModuleContext } from '../module-api/module-context';

export class AutoLookAtModule implements Imodule {
  public readonly name = 'AutoLookAt';
  public enabled = true;

  private context: ModuleContext; // Add context property
  private lastChangeTime: number = 0;
  private nextChangeInterval: number = 0; // In milliseconds

  constructor() {
    this.setNextChangeInterval();
  }

  private setNextChangeInterval(): void {
    this.nextChangeInterval = Math.random() * (10000 - 3000) + 3000; // Random between 3 to 10 seconds
  }

  public setModuleContext(context: ModuleContext): void {
    this.context = context;
  }

  public update(delta: number, vrm: VRM): void {
    const currentTime = performance.now();

    if (currentTime - this.lastChangeTime > this.nextChangeInterval) {
        this.lastChangeTime = currentTime;
        this.setNextChangeInterval();

        const targets = [null, 'camera', 'mouse'];
        const randomIndex = Math.floor(Math.random() * targets.length);
        const selectedTargetType = targets[randomIndex];

        if (selectedTargetType === 'camera') {
            this.context.actions.lookAt('camera');
            console.log('[AutoLookAtModule] Looking at camera.');
        } else if (selectedTargetType === 'mouse') {
            this.context.actions.lookAt('mouse');
            console.log('[AutoLookAtModule] Looking at mouse.');
        } else { // null
            this.context.actions.lookAt(null);
            console.log('[AutoLookAtModule] Looking at null.');
        }
    }
  }
}
