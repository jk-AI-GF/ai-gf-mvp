/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 */

import './index.css';
import './main-ui';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMHumanBoneName } from '@pixiv/three-vrm';
import { ModuleManager } from '../modules/module-manager';

import { AutoLookAtModule } from '../modules/auto-look-at-module';
import { AutoBlinkmodule } from '../modules/auto-blink-module';
import { AutoIdleAnimationmodule } from '../modules/auto-idle-animation-module';
import { ProactiveDialoguemodule } from '../modules/proactive-dialogue-module';
import { ActionTestModule } from '../modules/action-test-module'; // 테스트 모듈 import
import { Actions } from '../module-api/actions';
import { ModuleContext } from '../module-api/module-context';
import { SystemControls } from '../module-api/system-controls';
import { EventBusImpl } from '../core/event-bus-impl';
import { TriggerEngine } from '../core/trigger-engine';
import { characterState } from '../core/character-state';
import { updateJointSliders, createJointSliders, setupPosePanelButton, setupAnimationPanelButton, setupSavePoseButton, setupLoadPoseFileButton, setupLoadVrmButton, listVrmMeshes, toggleVrmMeshVisibility, createMeshList, appendMessage } from './ui-manager';
import { VRMManager } from './vrm-manager';

let controls: OrbitControls | null = null;
let isFreeCameraMode = true;


const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0.0, -0.1, 3.5);
const DEFAULT_CAMERA_ROTATION = new THREE.Euler(0.14, 0.0, 0.0);
const DEFAULT_FREE_CAMERA_POSITION = new THREE.Vector3(0.0, 0.0, 3.0);
const DEFAULT_FREE_CAMERA_ROTATION = new THREE.Euler(0.0, 0.0, 0.0);

const eventBusImpl = new EventBusImpl();
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
};

const systemControls: SystemControls = {
  toggleTts: (enable: boolean) => {
    toggleTts(enable);
  },
  setMasterVolume: (volume: number) => {
    setMasterVolume(volume);
  },
};

const moduleContext: ModuleContext = {
  eventBus: eventBusImpl,
  registerTrigger: (trigger) => triggerEngine.registerTrigger(trigger),
  actions: actions,
  system: systemControls,
  characterState: characterState,
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
window.electronAPI.on('look-at-in-renderer', (target: 'camera' | [number, number, number] | null) => {
  actions.lookAt(target);
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

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

controls = new OrbitControls(camera, renderer.domElement);

// Initialize VRM Manager
const vrmManager = new VRMManager(scene, camera);
window.vrmManager = vrmManager; // Make it globally accessible

// Initialize and register modules
const autoLookAtmodule = new AutoLookAtModule();
moduleManager.register(autoLookAtmodule);
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
    moduleManager.update(delta, currentVrm);
    
    // Update floating messages
    const headPosition = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)?.getWorldPosition(tempVector);
    if (headPosition) {
      headPosition.y += 0.2; // Adjust height slightly above the head
      headPosition.project(camera);

      // Convert to screen coordinates
      const x = (headPosition.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
      const y = (-headPosition.y * 0.5 + 0.5) * renderer.domElement.clientHeight;

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
  
  updateJointSliders();
  renderer.render(scene, camera);
}
animate();

/**
 * Converts 2D mouse coordinates to a 3D point in the Three.js scene, intersecting with the ground plane.
 * @param mouseX Normalized device coordinates (NDC) X (-1 to 1).
 * @param mouseY Normalized device coordinates (NDC) Y (-1 to 1).
 * @returns A THREE.Vector3 representing the 3D point, or null if no intersection.
 */
function get3DPointFromMouse(): THREE.Vector3 {
  const mouse = new THREE.Vector2(window.mousePosition.x, window.mousePosition.y);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Create a plane in front of the camera
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  const cameraPosition = new THREE.Vector3();
  camera.getWorldPosition(cameraPosition);

  const planeDistance = 1.5; // Distance of the plane from the camera
  const planePoint = new THREE.Vector3().addVectors(cameraPosition, cameraDirection.multiplyScalar(planeDistance));
  const dynamicPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDirection.negate(), planePoint);

  const intersectionPoint = new THREE.Vector3();
  const point = raycaster.ray.intersectPlane(dynamicPlane, intersectionPoint);

  if (point) {
    return point;
  }

  // Fallback: if no intersection, use the old ground plane method
  const intersects = raycaster.intersectObject(plane); // `plane` is the ground plane mesh
  if (intersects.length > 0) {
    return intersects[0].point;
  }

  // Final fallback: a point in front of the camera
  const fallbackPoint = new THREE.Vector3();
  raycaster.ray.at(10, fallbackPoint);
  return fallbackPoint;
}

// --- Global Window Functions & UI Setup ---

window.setClearColor = (color: number) => {
  renderer.setClearColor(color, 0.1);
};

const cameraModeButton = document.getElementById('toggle-camera-mode-button');
if (cameraModeButton) {
  cameraModeButton.addEventListener('click', () => {
    window.toggleCameraMode();
  });
}

window.toggleCameraMode = function(): void {
  isFreeCameraMode = !isFreeCameraMode;
  if (controls) controls.enabled = isFreeCameraMode;
  if (!isFreeCameraMode) {
    // Fixed camera mode
    controls.reset();
    controls.enabled = false;
    camera.position.copy(DEFAULT_CAMERA_POSITION);
    camera.rotation.copy(DEFAULT_CAMERA_ROTATION);
    camera.fov = 20; // Set lower FOV for fixed mode
  } else {
    // Free camera mode
    camera.position.copy(DEFAULT_FREE_CAMERA_POSITION);
    camera.rotation.copy(DEFAULT_FREE_CAMERA_ROTATION);
    camera.fov = 35; // Reset to default FOV for free mode
    controls.enabled = true;
  }

  camera.updateMatrix();
  console.log(`Camera mode: ${isFreeCameraMode ? 'Free' : 'Fixed'}`);
};

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

window.mousePosition = { x: 0, y: 0 };
document.addEventListener('mousemove', (event) => {
  window.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
  window.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

import { initAudioContext, playTTS, toggleTts, setMasterVolume } from './audio-service';







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
window.get3DPointFromMouse = get3DPointFromMouse;

console.log('👋 VRM Overlay loaded successfully.');
