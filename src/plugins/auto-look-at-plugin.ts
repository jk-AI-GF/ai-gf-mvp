import { IPlugin } from './plugin-manager';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { PluginContext } from '../plugin-api/plugin-context';

export class AutoLookAtPlugin implements IPlugin {
  public readonly name = 'AutoLookAt';
  public enabled = true;

  private context: PluginContext; // Add context property
  private lastChangeTime: number = 0;
  private nextChangeInterval: number = 0; // In milliseconds

  constructor() {
    this.setNextChangeInterval();
  }

  private setNextChangeInterval(): void {
    this.nextChangeInterval = Math.random() * (10000 - 7000) + 500; // Random
  }

  public setPluginContext(context: PluginContext): void {
    this.context = context;
  }

  public update(delta: number, vrm: VRM): void {
    const currentTime = performance.now();

    if (currentTime - this.lastChangeTime > this.nextChangeInterval) {
        this.lastChangeTime = currentTime;
        this.setNextChangeInterval();

        const targets = ['camera', 'mouse', null]; //null 임시 제거 
        const randomIndex = Math.floor(Math.random() * targets.length);
        const selectedTargetType = targets[randomIndex];

        if (selectedTargetType === 'camera') {
            this.context.actions.lookAt('camera');
            console.log('[AutoLookAtPlugin] Looking at camera.');
        } else if (selectedTargetType === 'mouse') {
            this.context.actions.lookAt('mouse');
            console.log('[AutoLookAtPlugin] Looking at mouse.');
        } else { // null
            this.context.actions.lookAt(null);
            console.log('[AutoLookAtPlugin] Looking at null.');
        }
    }
  }
}
