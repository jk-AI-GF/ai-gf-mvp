import * as THREE from 'three';
import { VRMManager } from '../renderer/vrm-manager';
import { Actions } from './actions';
import { SystemControls } from './system-controls';
import { PluginContext } from './plugin-context';
import eventBus from '../core/event-bus';
import { TriggerEngine } from '../core/trigger-engine';
import { characterState } from '../core/character-state';
import { playTTS } from '../renderer/audio-service';

// This factory creates the context object that plugins will use to interact with the system.
// It encapsulates the direct dependencies on managers and services.

export function createPluginContext(
  vrmManager: VRMManager,
  triggerEngine: TriggerEngine,
  renderer: THREE.WebGLRenderer,
  systemControls: SystemControls, // Pass in the fully-formed controls
): PluginContext {

  const actions: Actions = {
    playAnimation: async (animationName: string, loop?: boolean, crossFadeDuration?: number) => {
      await vrmManager.loadAndPlayAnimation(animationName, loop, crossFadeDuration);
    },
    showMessage: (message: string, duration?: number) => {
      eventBus.emit('ui:showFloatingMessage', { text: message });
    },
    setExpression: (expressionName: string, weight: number, duration?: number) =>
      vrmManager.animateExpression(expressionName, weight, duration),
    setExpressionWeight: (expressionName: string, weight: number) => {
      if (vrmManager.currentVrm?.expressionManager) {
        vrmManager.currentVrm.expressionManager.setValue(expressionName, weight);
      }
    },
    setPose: async (poseName: string) => {
      vrmManager.loadAndApplyPose(poseName);
    },
    lookAt: (target: 'camera' | 'mouse' | [number, number, number] | null) => {
      if (target === 'camera') {
        vrmManager.lookAt('camera');
      } else if (target === 'mouse') {
        vrmManager.lookAt('mouse');
      } else if (Array.isArray(target)) {
        vrmManager.lookAt(new THREE.Vector3(target[0], target[1], target[2]));
      } else if (target === null) {
        vrmManager.lookAt(null);
      }
    },
    changeBackground: (imagePath: string) => {
      document.body.style.backgroundImage = `url('${imagePath}')`;
      document.body.style.backgroundColor = 'transparent';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      renderer.setClearAlpha(0);
    },
    speak: (text: string) => {
      playTTS(text);
    },
    setHitboxesVisible: (visible: boolean) => {
      vrmManager.setHitboxesVisible(visible);
    },
    setContext: (key: string, value: any) => {
      window.electronAPI.send('context:set', key, value);
    },
    getContext: async (key: string): Promise<any> => {
      return window.electronAPI.invoke('context:get', key);
    },
  };

  const pluginContext: PluginContext = {
    eventBus: eventBus,
    registerTrigger: (trigger) => triggerEngine.registerTrigger(trigger),
    actions: actions,
    system: systemControls,
    get: (key: string) => window.electronAPI.invoke('context:get', key),
    set: (key: string, value: any) => window.electronAPI.send('context:set', key, value),
    getAll: () => window.electronAPI.invoke('context:getAll'),
    characterState: characterState,
    vrmManager: vrmManager,
  };

  return pluginContext;
}
