import * as THREE from 'three';
import { VRMManager } from '../renderer/vrm-manager';
import { Actions } from './actions';
import { SystemControls } from './system-controls';
import { PluginContext } from './plugin-context';
import eventBus from '../core/event-bus';
import { TriggerEngine } from '../core/trigger-engine';
import { characterState } from '../core/character-state';
import { toggleTts, setMasterVolume, playTTS } from '../renderer/audio-service';

// This factory creates the context object that plugins will use to interact with the system.
// It encapsulates the direct dependencies on managers and services.

export function createPluginContext(
  vrmManager: VRMManager,
  triggerEngine: TriggerEngine,
  renderer: THREE.WebGLRenderer
): PluginContext {

  const actions: Actions = {
    playAnimation: async (animationName: string, loop?: boolean, crossFadeDuration?: number) => {
      const result = await vrmManager.loadAndParseFile(animationName);
      if (result?.type === 'animation') {
        vrmManager.playAnimation(result.data, loop, crossFadeDuration);
      } else if (result?.type === 'pose') {
        console.warn(`[Action] playAnimation was called with a pose file: ${animationName}. Use setPose instead.`);
        vrmManager.applyPose(result.data);
      }
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
      const result = await vrmManager.loadAndParseFile(`Pose/${poseName}`);
      if (result?.type === 'pose') {
        vrmManager.applyPose(result.data);
      } else if (result?.type === 'animation') {
        console.warn(`[Action] setPose was called with an animation file: ${poseName}. Use playAnimation instead.`);
        vrmManager.playAnimation(result.data, false);
      }
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
    setContext: (key: string, value: any) => {
      window.electronAPI.send('context:set', key, value);
    },
    changeBackground: (imagePath: string) => {
      document.body.style.backgroundImage = `url('${imagePath}')`;
      document.body.style.backgroundColor = 'transparent';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      renderer.setClearAlpha(0);
    },
    getContext: async (key: string): Promise<any> => {
      return window.electronAPI.invoke('context:get', key);
    },
    speak: (text: string) => {
      playTTS(text);
    }
  };

  const systemControls: SystemControls = {
    toggleTts: (enable: boolean) => {
      toggleTts(enable);
    },
    setMasterVolume: (volume: number) => {
      setMasterVolume(volume);
    },
  };

  const pluginContext: PluginContext = {
    eventBus: eventBus,
    registerTrigger: (trigger) => triggerEngine.registerTrigger(trigger),
    actions: actions,
    system: systemControls,
    characterState: characterState,
    vrmManager: vrmManager,
  };

  return pluginContext;
}
