/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 */

import './index.css';
import './app-main';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { VRMHumanBoneName } from '@pixiv/three-vrm';
import { PluginManager } from '../plugins/plugin-manager';

import { AutoLookAtPlugin } from '../plugins/auto-look-at-plugin';
import { AutoBlinkPlugin } from '../plugins/auto-blink-plugin';
import { AutoIdleAnimationPlugin } from '../plugins/auto-idle-animation-plugin';
import { ProactiveDialoguePlugin } from '../plugins/proactive-dialogue-plugin';
import { ActionTestPlugin } from '../plugins/action-test-plugin'; // 테스트 플러그인 import
import { GrabVrmPlugin } from '../plugins/grab-vrm-plugin'; // 새로 추가
import { Actions } from '../plugin-api/actions';
import { PluginContext } from '../plugin-api/plugin-context';
import { SystemControls } from '../plugin-api/system-controls';
import eventBus from '../core/event-bus';
import { TriggerEngine } from '../core/trigger-engine';
import { characterState } from '../core/character-state';
import { setupPosePanelButton, setupAnimationPanelButton, setupSavePoseButton, setupLoadPoseFileButton, setupLoadVrmButton, createMeshList, appendMessage, clearMeshList, toggleVrmMeshVisibility } from './ui-manager';
import { VRMManager } from './vrm-manager';
import { setClearColor, toggleCameraMode, onWindowResize, DEFAULT_FREE_CAMERA_POSITION, DEFAULT_FREE_CAMERA_ROTATION, getIntersectedObject } from './scene-utils';
import { initAudioContext, playTTS, toggleTts, setMasterVolume } from './audio-service';


let controls: OrbitControls | null = null;
let isFreeCameraMode = true;


const triggerEngine = new TriggerEngine();

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
    appendMessage('assistant', message);
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
    // This action is handled in the main process, but we need a placeholder
    // for the renderer-side plugin context. It sends the data to the main process.
    window.electronAPI.send('context:set', key, value);
  },
  changeBackground: (imagePath: string) => {
    // Set the body's background image and ensure the background color is transparent
    document.body.style.backgroundImage = `url('${imagePath}')`;
    document.body.style.backgroundColor = 'transparent';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    
    // Make the renderer canvas transparent to show the body background
    renderer.setClearAlpha(0);
  },
  getContext: async (key: string): Promise<any> => {
    return window.electronAPI.invoke('context:get', key);
  },
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
};

const pluginManager = new PluginManager(pluginContext);
window.pluginManager = pluginManager;

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
window.electronAPI.on('look-at-in-renderer', (target: 'camera' | [number, number, number] | null) => {
  actions.lookAt(target);
});
window.electronAPI.on('change-background', (imagePath: string) => {
  console.log('[Renderer] Received change-background command:', imagePath);
  actions.changeBackground(imagePath);
});

// IPC handlers for characterState
window.electronAPI.on('get-character-state-curiosity', (event) => {
  event.returnValue = characterState.curiosity;
});
window.electronAPI.on('set-character-state-curiosity', (value: number) => {
  characterState.curiosity = value;
});

if (!window.floatingMessages) {
  window.floatingMessages = [];
}

const tempVector = new THREE.Vector3();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.copy(DEFAULT_FREE_CAMERA_POSITION);
camera.rotation.copy(DEFAULT_FREE_CAMERA_ROTATION);

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(2, 5, 3);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

// Add a ground plane for shadows
const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.7 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -0.601;
plane.receiveShadow = true;
plane.material.depthWrite = false;
scene.add(plane);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
setClearColor(renderer, 0x000000);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
const canvasContainer = document.getElementById('canvas-container');
canvasContainer.appendChild(renderer.domElement);

window.addEventListener('resize', () => onWindowResize(camera, renderer));

controls = new OrbitControls(camera, renderer.domElement);

// Add a click event listener to the renderer
renderer.domElement.addEventListener('mousedown', (event) => {
  if (vrmManager.hitboxes.length > 0) {
    const intersectedObject = getIntersectedObject(event, camera, vrmManager.hitboxes);
    if (intersectedObject) {
      const partName = intersectedObject.name.replace('hitbox_', '');
      
      // 0: Left button, 1: Middle button, 2: Right button
      if (event.button === 0) {
        eventBus.emit('character_part_clicked', { partName });
      } else if (event.button === 2) {
        eventBus.emit('character_part_right_clicked', { partName });
      }
    }
  }
}, false);

// Prevent the default context menu on right-click
renderer.domElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});


// Initialize VRM Manager
const vrmManager = new VRMManager(scene, camera, plane, eventBus);
window.vrmManager = vrmManager; // Make it globally accessible

// IMPORTANT: Expose expression animation function to the window object
// so that ChatService can call it.
window.animateExpression = vrmManager.animateExpression.bind(vrmManager);


// Initialize and register plugins
const autoLookAtPlugin = new AutoLookAtPlugin();
pluginManager.register(autoLookAtPlugin);
const autoBlinkPlugin = new AutoBlinkPlugin();
pluginManager.register(autoBlinkPlugin);
const autoIdleAnimationPlugin = new AutoIdleAnimationPlugin();
pluginManager.register(autoIdleAnimationPlugin);
const proactiveDialoguePlugin = new ProactiveDialoguePlugin();
pluginManager.register(proactiveDialoguePlugin);

// Register the test plugin
const actionTestPlugin = new ActionTestPlugin();
pluginManager.register(actionTestPlugin);
const grabVrmPlugin = new GrabVrmPlugin();
pluginManager.register(grabVrmPlugin);

// --- Event-driven UI Updates ---
eventBus.on('vrm:loaded', ({ vrm }) => {
  console.log('[Renderer] Event received: vrm:loaded. Updating UI.');
  // Update global state for UI functions that might still depend on it (transitional)
  window.currentVrm = vrm;
  window.expressionMap = vrm.expressionManager.expressionMap;
  window.vrmExpressionList = Object.keys(vrm.expressionManager.expressionMap);
  
  // Call UI update functions
  createMeshList(vrm, toggleVrmMeshVisibility);
});

eventBus.on('vrm:unloaded', () => {
  console.log('[Renderer] Event received: vrm:unloaded. Clearing UI.');
  window.currentVrm = null;
  window.expressionMap = {};
  window.vrmExpressionList = [];
  
  clearMeshList();
});


// Initial model load
vrmManager.loadVRM('VRM/Liqu.vrm');

const vrmFollowButton = document.getElementById('vrm-follow-button') as HTMLElement;
if (!vrmFollowButton) {
  console.error('VRM follow button element not found!');
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  
  vrmManager.update(delta);
  
  const currentVrm = vrmManager.currentVrm;
  if (currentVrm) {
    pluginManager.update(delta, currentVrm);
    
    // Update floating messages
    const headPosition = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)?.getWorldPosition(tempVector);
    if (headPosition) {
      headPosition.y += 0.2; // Adjust height slightly above the head
      headPosition.project(camera);

      // Convert to screen coordinates
      const x = (headPosition.x * 0.5 + 0.65) * renderer.domElement.clientWidth;
      const y = (-headPosition.y * 0.5 + 0.65) * renderer.domElement.clientHeight;

      // Update button position
      vrmFollowButton.style.left = `${x}px`;
      vrmFollowButton.style.top = `${y}px`;
      vrmFollowButton.style.display = 'block'; // Show the button when VRM is present

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
  } else {
    vrmFollowButton.style.display = 'none'; // Hide the button if no VRM is loaded
  }
  
  if (isFreeCameraMode) {
    controls?.update();
  }
  
  renderer.render(scene, camera);
}
animate();

const cameraModeButton = document.getElementById('toggle-camera-mode-button');
if (cameraModeButton) {
  cameraModeButton.addEventListener('click', () => {
    toggleCameraMode(camera, controls);
  });
}

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

console.log('👋 VRM Overlay loaded successfully.');


// Initialize audio context on user interaction
document.addEventListener('click', initAudioContext, { once: true });

// TTS IPC handler
window.electronAPI.on('tts-speak', (text: string) => {
  playTTS(text);
});

// Expose functions to window for UI interaction
window.setMasterVolume = setMasterVolume;
window.appendMessage = appendMessage;
window.toggleTts = toggleTts;

// --- React Integration ---
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

