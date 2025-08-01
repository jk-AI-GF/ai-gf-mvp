import * as THREE from 'three';
import { VRMManager } from '../renderer/vrm-manager';
import { Actions, ActionDefinition } from './actions';
import { SystemControls } from './system-controls';
import { PluginContext } from './plugin-context';
import eventBus from '../core/event-bus';
import { TriggerEngine } from '../core/trigger-engine';
import { characterState } from '../core/character-state';
import { playTTS } from '../renderer/audio-service';

// This factory creates the context object that plugins will use to interact with the system.
// It encapsulates the direct dependencies on managers and services.

const availableActions: ActionDefinition[] = [
  {
    name: 'playAnimation',
    description: '캐릭터 애니메이션을 재생합니다.',
    params: [
      { name: 'animationName', type: 'string', description: '애니메이션 파일 이름' },
      { name: 'loop', type: 'boolean', defaultValue: false, description: '반복 여부' },
      { name: 'crossFadeDuration', type: 'number', defaultValue: 0.5, description: '페이드 시간(초)' },
    ],
  },
  {
    name: 'speak',
    description: '캐릭터가 말을 합니다 (TTS).',
    params: [{ name: 'text', type: 'string', description: '말할 내용' }],
  },
  {
    name: 'setExpression',
    description: '캐릭터의 표정을 변경합니다.',
    params: [
      { name: 'expressionName', type: 'string', description: '표정 이름' },
      { name: 'weight', type: 'number', defaultValue: 1.0, description: '강도 (0-1)' },
      { name: 'duration', type: 'number', defaultValue: 0.1, description: '변경 시간(초)' },
    ],
  },
  {
    name: 'setPose',
    description: '캐릭터의 포즈를 설정합니다.',
    params: [{ name: 'poseName', type: 'string', description: '포즈 파일 이름' }],
  },
  {
    name: 'lookAt',
    description: '캐릭터의 시선을 고정합니다.',
    params: [
      {
        name: 'target',
        type: 'enum',
        options: ['camera', 'mouse', 'null'],
        description: '바라볼 대상',
      },
    ],
  },
  {
    name: 'resetPose',
    description: '캐릭터를 기본 T-Pose로 되돌립니다.',
    params: [],
  },
  {
    name: 'setCameraMode',
    description: '카메라 모드를 변경합니다.',
    params: [
      {
        name: 'mode',
        type: 'enum',
        options: ['orbit', 'fixed'],
        description: '카메라 모드',
      },
    ],
  },
];

export function createPluginContext(
  vrmManager: VRMManager,
  triggerEngine: TriggerEngine,
  renderer: THREE.WebGLRenderer,
  systemControls: SystemControls, // Pass in the fully-formed controls
): PluginContext {

  const actions: Actions = {
    getAvailableActions: () => Promise.resolve(availableActions),
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
    resetPose: () => {
      vrmManager.resetToTPose();
    },
    saveCurrentPose: () => {
      vrmManager.saveCurrentPose();
    },
    loadCharacter: async (fileName: string) => {
      await vrmManager.loadVRM(fileName);
    },
    setCameraMode: (mode: 'orbit' | 'fixed') => {
      eventBus.emit('camera:setMode', { mode });
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
