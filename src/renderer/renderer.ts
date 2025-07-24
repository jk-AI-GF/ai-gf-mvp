/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMLoaderPlugin, VRM, VRMHumanBoneName, VRMPose } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { ModuleManager } from '../modules/module-manager';
import { LookAtCameramodule } from '../modules/look-at-camera-module';
import { AutoBlinkmodule } from '../modules/auto-blink-module';
import { AutoIdleAnimationmodule } from '../modules/auto-idle-animation-module';
import { ProactiveDialoguemodule } from '../modules/proactive-dialogue-module';
import { Actions } from '../module-api/actions';
import { ModuleContext } from '../module-api/module-context';
import { SystemControls } from '../module-api/system-controls';
import { EventBusImpl } from '../core/event-bus-impl';
import { TriggerEngine } from '../core/trigger-engine';
import { updateJointSliders, createJointSliders, createExpressionSliders, updateExpressionSliderValue, setupPosePanelButton, setupAnimationPanelButton, setupSavePoseButton, setupLoadPoseFileButton, setupLoadVrmButton, logVrmBoneNames, listVrmMeshes, toggleVrmMeshVisibility, createMeshList } from './ui-manager';  

let mixer: THREE.AnimationMixer;
let currentVrm: VRM | null = null;
let controls: OrbitControls | null = null;
let currentAction: THREE.AnimationAction | null = null; // 현재 재생 중인 애니메이션 액션
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0.0, 0.0, 3.0);
const DEFAULT_CAMERA_ROTATION = new THREE.Euler(-0.08, 0.0, 0.0);
let isFreeCameraMode = true; // 초기 카메라는 자유 모드
let isTtsActive = false; // TTS 활성화 여부를 제어하는 변수

// Actions 구현체
const actions: Actions = {
  playAnimation: (animationName: string, loop?: boolean, crossFadeDuration?: number) => {
    window.loadAnimationFile(animationName, { loop, crossFadeDuration });
  },
  showMessage: (message: string, duration?: number) => {
    window.appendMessage('assistant', message); // Assuming showMessage is for assistant messages
  },
  setExpression: (expressionName: string, weight: number, duration?: number) => {
    window.animateExpression(expressionName, weight, duration);
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
// Main process로부터의 IPC 메시지 수신
window.electronAPI.on('play-animation-in-renderer', (animationName: string, loop: boolean, crossFadeDuration: number) => {
  actions.playAnimation(animationName, loop, crossFadeDuration);
});

window.electronAPI.on('show-message-in-renderer', (message: string, duration: number) => {
  actions.showMessage(message, duration);
});

window.electronAPI.on('set-expression-in-renderer', (expressionName: string, weight: number, duration: number) => {
  actions.setExpression(expressionName, weight, duration);
});

if (!window.floatingMessages) {
  window.floatingMessages = [];
}
const tempVector = new THREE.Vector3();

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
// 초기 카메라 위치와 회전은 자유 모드 여부에 따라 설정
if (!isFreeCameraMode) {
  camera.position.copy(DEFAULT_CAMERA_POSITION);
  camera.rotation.copy(DEFAULT_CAMERA_ROTATION);
} else {
  camera.position.set(0.0, 0.0, 3.0);
  camera.rotation.set(-0.08, 0.0, 0.0);
}

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(2, 5, 3); // Adjusted position for better shadow casting
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 50;
light.shadow.camera.left = -5;
light.shadow.camera.right = 5;
light.shadow.camera.top = 5;
light.shadow.camera.bottom = -5;
scene.add(light);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(width, height);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; // Enable shadow maps
document.body.appendChild(renderer.domElement);

controls = new OrbitControls(camera, renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

// Initialize and register modules
const lookAtCameramodule = new LookAtCameramodule(camera);
moduleManager.register(lookAtCameramodule);

const autoBlinkmodule = new AutoBlinkmodule();
moduleManager.register(autoBlinkmodule);

const autoIdleAnimationmodule = new AutoIdleAnimationmodule();
moduleManager.register(autoIdleAnimationmodule);

const proactiveDialoguemodule = new ProactiveDialoguemodule();
moduleManager.register(proactiveDialoguemodule);

// Add a ground plane for shadows
const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.ShadowMaterial();
planeMaterial.opacity = 0.7; // Increased opacity for better visibility
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane
plane.position.y = -0.601; // Place it slightly below the VRM model's base
plane.receiveShadow = true; // This plane will receive shadows
plane.material.depthWrite = false; // Important for transparent planes to receive shadows correctly
scene.add(plane);

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));
loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

const fbxLoader = new FBXLoader();

function loadVRM(filePathOrUrl: string) {
  // 이전에 로드된 모델이 있다면 씬에서 제거
  if (currentVrm) {
    scene.remove(currentVrm.scene);
    currentVrm = null;
  }

  const isAbsolute = filePathOrUrl.startsWith('file://');
  const promise = isAbsolute 
    ? window.electronAPI.readAbsoluteFile(filePathOrUrl.substring(7))
    : window.electronAPI.readAssetFile(filePathOrUrl);

  promise
    .then(async (fileContent) => {
      if (fileContent instanceof ArrayBuffer === false) {
        if (typeof fileContent === 'object' && 'error' in fileContent) {
          throw new Error(fileContent.error);
        }
        throw new Error('Invalid file content received.');
      }
      
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        loader.parse(fileContent as ArrayBuffer, '', resolve, reject);
      });

      const vrm = gltf.userData.vrm as VRM;
      vrm.scene.position.set(0, 3.0, 0); // 모델을 공중으로 이동
      vrm.scene.rotation.y = Math.PI;
      scene.add(vrm.scene);
      currentVrm = vrm;
      window.currentVrm = vrm;

      // 새 VRM 모델 로드 시 메쉬 목록 업데이트
      

      mixer = new THREE.AnimationMixer(vrm.scene);

      // Enable shadows for all meshes in the VRM model
      vrm.scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          object.castShadow = true;
          object.frustumCulled = false; // 프러스텀 컬링 비활성화
        }
      });

      // 모델 로딩 후 잠깐의 텀을 줍니다.
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 지연

      // 초기 애니메이션 재생: VRMA_02.vrma
      window.loadAnimationFile('Animation/VRMA_02.vrma');

      // 모델을 바닥으로 떨어뜨리는 애니메이션 시작
      await animateVrmDrop(vrm, 0.5, 3.0, -0.6); // 0.5초 동안 3.0에서 -0.6으로 이동

      // 3초 후 VRMA_03.vrma 재생
      setTimeout(() => {
        window.loadAnimationFile('Animation/VRMA_03.vrma');
      }, 3000);
      
      // Set default Expression
      window.expressionMap = vrm.expressionManager.expressionMap;

      // VRM 모델의 표정 목록을 가져와 window.vrmExpressionList에 할당
      if (vrm.expressionManager) {
        window.vrmExpressionList = Object.keys(vrm.expressionManager.expressionMap);
        createExpressionSliders();
      }
    })
    .catch((error: unknown) => {
      console.error('VRM 로드 실패:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`VRM 모델 로드에 실패했습니다: ${message}`);
    });
}

// 초기 모델 로드
loadVRM('VRM/Liqu.vrm');

const clock = new THREE.Clock();

/**
 * VRM 모델을 지정된 시간 동안 시작 Y 위치에서 목표 Y 위치로 부드럽게 이동시킵니다.
 * @param vrm VRM 모델 인스턴스
 * @param duration 애니메이션 지속 시간 (초)
 * @param startY 시작 Y 위치
 * @param endY 목표 Y 위치
 */
function animateVrmDrop(vrm: VRM, duration: number, startY: number, endY: number): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();

    function step() {
      const elapsedTime = (performance.now() - startTime) / 1000; // 초 단위
      const progress = Math.min(elapsedTime / duration, 1);

      vrm.scene.position.y = startY + (endY - startY) * progress;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (currentVrm) {
    moduleManager.update(delta, currentVrm);
    currentVrm.update(delta);
    
    currentVrm.scene.traverse(object => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
        (object as THREE.SkinnedMesh).skeleton.update();
      }
    });

    // Update floating messages
    const headPosition = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)?.getWorldPosition(tempVector);
    if (headPosition) {
      // Offset the message slightly above the head
      headPosition.y += 0.2; // Adjust this value as needed
      
      // Project 3D world position to 2D screen position
      headPosition.project(camera);

      const x = (headPosition.x * 0.5 + 0.64) * renderer.domElement.clientWidth;
      const y = (-headPosition.y * 0.5 + 0.62) * renderer.domElement.clientHeight;

      const currentTime = performance.now();
      for (let i = window.floatingMessages.length - 1; i >= 0; i--) {
        const message = window.floatingMessages[i];
        const age = currentTime - message.timestamp;
        const duration = 5000; // Message visible for 5 seconds
        const fadeDuration = 1000; // Fade out over 1 second

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
  if (controls) controls.update();
  updateJointSliders();
  renderer.render(scene, camera);
}
animate();

window.setClearColor = (color: number) => {
  renderer.setClearColor(color, 0.1);
};

/**
 * 카메라 모드를 토글합니다 (자유 카메라 <-> 고정 카메라).
 */
window.toggleCameraMode = function(): void {
  isFreeCameraMode = !isFreeCameraMode;
  if (isFreeCameraMode) {
    if (controls) controls.enabled = true;
    console.log('Camera mode: Free');
  } else {
    if (controls) controls.enabled = false;
    // 고정 카메라 모드일 때 카메라 위치와 회전을 기본값으로 재설정
    camera.position.copy(DEFAULT_CAMERA_POSITION);
    camera.rotation.copy(DEFAULT_CAMERA_ROTATION);
    camera.updateProjectionMatrix();
    console.log('Camera mode: Fixed');
  }
};

function onWindowResize() {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(newWidth, newHeight);
}

window.addEventListener('resize', onWindowResize);



console.log('👋 VRM 오버레이 로딩 완료');

function animateExpression(expressionName: string, targetWeight: number, duration: number) {
  if (!window.currentVrm || !window.currentVrm.expressionManager) return;

  const expressionManager = window.currentVrm.expressionManager;

  // Ensure the target expression exists in the map
  if (!expressionManager.expressionMap[expressionName]) {
    console.error(`Expression "${expressionName}" not found in the VRM model.`);
    return;
  }

  const startWeight = expressionManager.getValue(expressionName) || 0.0;
  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / (duration * 1000), 1);
    const currentWeight = startWeight + (targetWeight - startWeight) * progress;

    expressionManager.setValue(expressionName, currentWeight);
    expressionManager.update();

    updateExpressionSliderValue(expressionName, currentWeight);

    // Reset other expressions to 0 and update their sliders
    // Iterate over expressionMap keys to ensure consistency with slider data attributes
    for (const name in expressionManager.expressionMap) {
      if (name !== expressionName) {
        expressionManager.setValue(name, 0.0);
        updateExpressionSliderValue(name, 0.0);
      }
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}
window.animateExpression = animateExpression;

function animateExpressionAdditive(expressionName: string, targetWeight: number, duration: number) {
  if (!window.currentVrm || !window.currentVrm.expressionManager) return;

  const expressionManager = window.currentVrm.expressionManager;

  // Ensure the target expression exists in the map
  if (!expressionManager.expressionMap[expressionName]) {
    console.error(`Additive Expression "${expressionName}" not found in the VRM model.`);
    return;
  }

  const startWeight = expressionManager.getValue(expressionName) || 0.0;
  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / (duration * 1000), 1);
    const currentWeight = startWeight + (targetWeight - startWeight) * progress;

    expressionManager.setValue(expressionName, currentWeight);
    expressionManager.update();

    updateExpressionSliderValue(expressionName, currentWeight);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}
window.animateExpressionAdditive = animateExpressionAdditive;


let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;

function initAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/wav'      // (선택) 명시적으로 WAV 응답을 기대
      },
      body: JSON.stringify({
        text,
        engine: 'google',           // 언어 필드는 더 이상 필요 없음
      }),
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
    masterGainNode.gain.value = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    console.log(`Master volume set to: ${masterGainNode.gain.value}`);
  }
};









async function loadAnimationFile(filePathOrUrl: string, options: { loop?: boolean; crossFadeDuration?: number } = {}) {
  if (!currentVrm || !mixer) return;

  const { loop = false, crossFadeDuration = 0.5 } = options;

  const isAbsolute = filePathOrUrl.startsWith('file://');
  const promise = isAbsolute
    ? window.electronAPI.readAbsoluteFile(filePathOrUrl.substring(7))
    : window.electronAPI.readAssetFile(filePathOrUrl);

  let newClip: THREE.AnimationClip | null = null;

  try {
    const fileContent = await promise;
    if (fileContent instanceof ArrayBuffer === false) {
      if (typeof fileContent === 'object' && 'error' in fileContent) {
        throw new Error(fileContent.error);
      }
      throw new Error('Invalid file content received.');
    }

    if (filePathOrUrl.endsWith('.vrma')) {
      // Attempt to parse as JSON first for pose data
      try {
        const poseData = JSON.parse(new TextDecoder().decode(fileContent as ArrayBuffer)) as VRMPose;
        if (poseData.hips) { // A simple check for a valid VRMPose object
          if (currentAction) {
            currentAction.stop();
            currentAction = null;
          }
          mixer.stopAllAction();
          currentVrm.humanoid.setNormalizedPose(poseData);
          currentVrm.scene.updateMatrixWorld(true);
          createJointSliders();
          console.log(`Loaded VRMA as JSON pose from ${filePathOrUrl}`);
          return;
        }
      } catch (e) {
        // Not a valid JSON pose, assume it's a VRM animation
      }
      
      // If not a pose, try to load as VRM animation
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        loader.parse(fileContent as ArrayBuffer, '', resolve, reject);
      });
      if (gltf.userData.vrmAnimations && gltf.userData.vrmAnimations[0]) {
        newClip = createVRMAnimationClip(gltf.userData.vrmAnimations[0], currentVrm);
      }

    } else if (filePathOrUrl.endsWith('.fbx')) {
      const fbx = fbxLoader.parse(fileContent as ArrayBuffer, '');
      if (fbx.animations && fbx.animations.length > 0) {
        newClip = fbx.animations[0];
      }
    }

    if (!newClip) {
      console.warn(`No animation clip could be loaded from ${filePathOrUrl}`);
      return;
    }

    const newAction = mixer.clipAction(newClip);
    newAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 0);
    if (!loop) {
      newAction.clampWhenFinished = true;
    }

    if (currentAction && currentAction !== newAction) {
      currentAction.crossFadeTo(newAction, crossFadeDuration, true);
      newAction.play();
    } else {
      newAction.play();
    }

    currentAction = newAction;
    console.log(`Loaded animation from ${filePathOrUrl} with crossfade.`);

  } catch (error) {
    console.error(`Error loading animation file from ${filePathOrUrl}:`, error);
    alert(`애니메이션 파일 로딩에 실패했습니다: ${(error as Error).message}`);
  }
}

window.loadAnimationFile = loadAnimationFile;

window.updateJointSliders = updateJointSliders;
window.createJointSliders = createJointSliders;

setupPosePanelButton(window.electronAPI, window.loadAnimationFile);
setupAnimationPanelButton(window.electronAPI, window.loadAnimationFile);
setupSavePoseButton(currentVrm, window.electronAPI);
setupLoadPoseFileButton(window.electronAPI, window.loadAnimationFile);
setupLoadVrmButton(window.electronAPI, loadVRM);
window.listVrmMeshes = () => listVrmMeshes(currentVrm);
window.toggleVrmMeshVisibility = (meshName: string, visible: boolean) => toggleVrmMeshVisibility(currentVrm, meshName, visible);
window.createMeshList = () => createMeshList(currentVrm, toggleVrmMeshVisibility);
