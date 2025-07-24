/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 */

import './index.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMHumanBoneName } from '@pixiv/three-vrm';
import { ModuleManager } from '../modules/module-manager';
import { LookAtCameramodule } from '../modules/look-at-camera-module';
import { AutoBlinkmodule } from '../modules/auto-blink-module';
import { AutoIdleAnimationmodule } from '../modules/auto-idle-animation-module';
import { ProactiveDialoguemodule } from '../modules/proactive-dialogue-module';
import { ActionTestModule } from '../modules/action-test-module'; // 테스트 모듈 import
import { Actions } from '../module-api/actions';
import { ModuleContext } from '../module-api/module-context';
import { SystemControls } from '../module-api/system-controls';
import { EventBusImpl } from '../core/event-bus-impl';
import { TriggerEngine } from '../core/trigger-engine';
import { updateJointSliders, createJointSliders, setupPosePanelButton, setupAnimationPanelButton, setupSavePoseButton, setupLoadPoseFileButton, setupLoadVrmButton, listVrmMeshes, toggleVrmMeshVisibility, createMeshList, appendMessage } from './ui-manager';
import { VRMManager } from './vrm-manager';

let controls: OrbitControls | null = null;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0.0, 0.0, 3.0);
const DEFAULT_CAMERA_ROTATION = new THREE.Euler(-0.08, 0.0, 0.0);
let isFreeCameraMode = true;
let isTtsActive = false;

// Actions implementation
const actions: Actions = {
  playAnimation: async (animationName: string, loop?: boolean, crossFadeDuration?: number) => {
    const result = await vrmManager.loadAndParseFile(animationName);
    if (result?.type === 'animation') {
      vrmManager.playAnimation(result.data, loop, crossFadeDuration);
    } else if (result?.type === 'pose') {
      console.warn(`[Action] playAnimation was called with a pose file: ${animationName}. Use setPose instead.`);
      vrmManager.applyPose(result.data); // Apply pose even if playAnimation was called
    }
  },
  showMessage: (message: string, duration?: number) => {
    window.appendMessage('assistant', message);
  },
  setExpression: (expressionName: string, weight: number, duration?: number) => {
    vrmManager.animateExpression(expressionName, weight, duration);
  },
  setPose: async (poseName: string) => {
    const result = await vrmManager.loadAndParseFile(`Pose/${poseName}`);
    if (result?.type === 'pose') {
      vrmManager.applyPose(result.data);
    } else if (result?.type === 'animation') {
      console.warn(`[Action] setPose was called with an animation file: ${poseName}. Use playAnimation instead.`);
      vrmManager.playAnimation(result.data, false); // Play animation even if setPose was called
    }
  },
};

const systemControls: SystemControls = {
  toggleTts: (enable: boolean) => {
    isTtsActive = enable;
    console.log(`TTS is now ${isTtsActive ? 'enabled' : 'disabled'}.`);
  },
  setMasterVolume: (volume: number) => {
    window.setMasterVolume(volume);
  },
};

const eventBusImpl = new EventBusImpl();
const triggerEngine = new TriggerEngine();

const moduleContext: ModuleContext = {
  eventBus: eventBusImpl,
  registerTrigger: (trigger) => triggerEngine.registerTrigger(trigger),
  actions: actions,
  system: systemControls,
};

const moduleManager = new ModuleManager(moduleContext);
window.moduleManager = moduleManager;

// IPC message handlers from main process
window.electronAPI.on('play-animation-in-renderer', (animationName: string, loop: boolean, crossFadeDuration: number) => {
  actions.playAnimation(animationName, loop, crossFadeDuration);
});
window.electronAPI.on('show-message-in-renderer', (message: string, duration: number) => {
  actions.showMessage(message, duration);
});
window.electronAPI.on('set-expression-in-renderer', (expressionName: string, weight: number, duration: number) => {
  actions.setExpression(expressionName, weight, duration);
});
window.electronAPI.on('set-pose-in-renderer', (poseName: string) => {
  actions.setPose(poseName);
});

if (!window.floatingMessages) {
  window.floatingMessages = [];
}

const tempVector = new THREE.Vector3();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.0, 0.0, 3.0);
camera.rotation.set(-0.08, 0.0, 0.0);

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(2, 5, 3);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

controls = new OrbitControls(camera, renderer.domElement);

// Initialize VRM Manager
const vrmManager = new VRMManager(scene);
window.vrmManager = vrmManager; // Make it globally accessible

// Initialize and register modules
const lookAtCameramodule = new LookAtCameramodule(camera);
moduleManager.register(lookAtCameramodule);
const autoBlinkmodule = new AutoBlinkmodule();
moduleManager.register(autoBlinkmodule);
const autoIdleAnimationmodule = new AutoIdleAnimationmodule();
moduleManager.register(autoIdleAnimationmodule);
const proactiveDialoguemodule = new ProactiveDialoguemodule();
moduleManager.register(proactiveDialoguemodule);

// Register the test module
const actionTestModule = new ActionTestModule();
moduleManager.register(actionTestModule);

// Add a ground plane for shadows
const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.7 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -0.601;
plane.receiveShadow = true;
plane.material.depthWrite = false;
scene.add(plane);

// Initial model load
vrmManager.loadVRM('VRM/Liqu.vrm');

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  
  vrmManager.update(delta);
  
  const currentVrm = vrmManager.currentVrm;
  if (currentVrm) {
    moduleManager.update(delta, currentVrm);
    
    // Update floating messages
    const headPosition = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)?.getWorldPosition(tempVector);
    if (headPosition) {
      headPosition.y += 0.2;
      headPosition.project(camera);
      const x = (headPosition.x * 0.5 + 0.64) * renderer.domElement.clientWidth;
      const y = (-headPosition.y * 0.5 + 0.62) * renderer.domElement.clientHeight;
      
      const currentTime = performance.now();
      for (let i = window.floatingMessages.length - 1; i >= 0; i--) {
        const message = window.floatingMessages[i];
        const age = currentTime - message.timestamp;
        const duration = 5000;
        const fadeDuration = 1000;

        if (age > duration) {
          message.element.remove();
          window.floatingMessages.splice(i, 1);
        } else if (age > (duration - fadeDuration)) {
          message.element.style.opacity = String(1 - (age - (duration - fadeDuration)) / fadeDuration);
        }
        message.element.style.left = `${x}px`;
        message.element.style.top = `${y}px`;
      }
    }
  }
  
  controls?.update();
  updateJointSliders();
  renderer.render(scene, camera);
}
animate();

// --- Global Window Functions & UI Setup ---

window.setClearColor = (color: number) => {
  renderer.setClearColor(color, 0.1);
};

window.toggleCameraMode = function(): void {
  isFreeCameraMode = !isFreeCameraMode;
  if (controls) controls.enabled = isFreeCameraMode;
  if (!isFreeCameraMode) {
    camera.position.copy(DEFAULT_CAMERA_POSITION);
    camera.rotation.copy(DEFAULT_CAMERA_ROTATION);
    camera.updateProjectionMatrix();
  }
  console.log(`Camera mode: ${isFreeCameraMode ? 'Free' : 'Fixed'}`);
};

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;

function initAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainNode = audioContext.createGain();
      masterGainNode.connect(audioContext.destination);
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e);
    }
  }
}
document.body.addEventListener('click', initAudioContext, { once: true });

async function playTTS(text: string) {
  if (!text || !audioContext || !isTtsActive || !masterGainNode) return;
  if (currentAudioSource) currentAudioSource.stop();
  try {
    const response = await fetch('http://localhost:8000/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'audio/wav' },
      body: JSON.stringify({ text, engine: 'google' }),
    });
    if (!response.ok) throw new Error(`TTS API error: ${response.status}`);
    const audioData = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(masterGainNode);
    source.start(0);
    currentAudioSource = source;
    source.onended = () => { currentAudioSource = null; };
  } catch (error) {
    if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
      console.error("TTS playback error:", error);
    }
  }
}
window.playTTS = playTTS;

window.toggleTts = function(enable: boolean) {
  isTtsActive = enable;
  console.log(`TTS is now ${isTtsActive ? 'enabled' : 'disabled'}.`);
};

window.setMasterVolume = function(volume: number) {
  if (masterGainNode) {
    masterGainNode.gain.value = Math.max(0, Math.min(1, volume));
    console.log(`Master volume set to: ${masterGainNode.gain.value}`);
  }
};

// Setup UI buttons and link them to the new VRMManager methods
async function handleFileSelectAndProcess(filePath: string, expectedType: 'pose' | 'animation') {
    const result = await vrmManager.loadAndParseFile(filePath);
    if (result?.type === 'pose' && expectedType === 'pose') {
        vrmManager.applyPose(result.data);
    } else if (result?.type === 'animation' && expectedType === 'animation') {
        vrmManager.playAnimation(result.data, false); // loop is false by default for panel selections
    } else if (result) {
        console.warn(`[UI] Selected file was a ${result.type}, but expected a ${expectedType}.`);
        alert(`선택한 파일은 ${expectedType} 타입이 아닙니다.`);
    }
}

setupPosePanelButton(window.electronAPI, (path) => handleFileSelectAndProcess(`Pose/${path}`, 'pose'));
setupAnimationPanelButton(window.electronAPI, (path) => handleFileSelectAndProcess(`Animation/${path}`, 'animation'));
setupSavePoseButton(() => vrmManager.currentVrm, window.electronAPI);
setupLoadPoseFileButton(window.electronAPI, (path) => handleFileSelectAndProcess(path, 'pose'));
setupLoadVrmButton(window.electronAPI, (path) => vrmManager.loadVRM(path));

window.listVrmMeshes = () => listVrmMeshes(vrmManager.currentVrm);
window.toggleVrmMeshVisibility = (meshName: string, visible: boolean) => toggleVrmMeshVisibility(vrmManager.currentVrm, meshName, visible);
window.createMeshList = () => createMeshList(vrmManager.currentVrm, toggleVrmMeshVisibility);
window.appendMessage = appendMessage;
window.updateJointSliders = updateJointSliders;
window.createJointSliders = createJointSliders;

console.log('👋 VRM Overlay loaded successfully.');
