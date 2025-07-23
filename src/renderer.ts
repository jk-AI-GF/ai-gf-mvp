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
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMLoaderPlugin, VRM, VRMHumanBoneName, VRMPose, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { createVRMAnimationClip, VRMAnimation } from '@pixiv/three-vrm-animation';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { PluginManager } from './plugins/plugin-manager';
import { LookAtCameraPlugin } from './plugins/look-at-camera-plugin';
import { AutoBlinkPlugin } from './plugins/auto-blink-plugin';
import { AutoIdleAnimationPlugin } from './plugins/auto-idle-animation-plugin';
import { ProactiveDialoguePlugin } from './plugins/proactive-dialogue-plugin';

let mixer: THREE.AnimationMixer;
let currentVrm: VRM | null = null;
let controls: OrbitControls | null = null;
let currentAction: THREE.AnimationAction | null = null; // 현재 재생 중인 애니메이션 액션
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0.0, 0.0, 3.0);
const DEFAULT_CAMERA_ROTATION = new THREE.Euler(-0.08, 0.0, 0.0);
let isFreeCameraMode = true; // 초기 카메라는 자유 모드

const pluginManager = new PluginManager();
window.pluginManager = pluginManager;

if (!window.floatingMessages) {
  window.floatingMessages = [];
}
const tempVector = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();

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

// Initialize and register plugins
const lookAtCameraPlugin = new LookAtCameraPlugin(camera);
pluginManager.register(lookAtCameraPlugin);

const autoBlinkPlugin = new AutoBlinkPlugin();
pluginManager.register(autoBlinkPlugin);

const autoIdleAnimationPlugin = new AutoIdleAnimationPlugin();
pluginManager.register(autoIdleAnimationPlugin);

const proactiveDialoguePlugin = new ProactiveDialoguePlugin();
pluginManager.register(proactiveDialoguePlugin);

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

function loadVRM(url: string) {
  // 이전에 로드된 모델이 있다면 씬에서 제거
  if (currentVrm) {
    scene.remove(currentVrm.scene);
    currentVrm = null;
  }

  const relativeVrmPath = url.startsWith('file://') ? url.substring(7).replace(/\\/g, '/').replace(process.cwd().replace(/\\/g, '/'), '').replace(/^\//, '') : url;

  window.electronAPI.readFileContent(relativeVrmPath)
    .then(async (fileContent) => {
      if (typeof fileContent === 'object' && 'error' in fileContent) {
        throw new Error(fileContent.error);
      }
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.parse(fileContent as ArrayBuffer, '', resolve, reject);
      });
      const vrm = gltf.userData.vrm as VRM;
      vrm.scene.position.set(0, 3.0, 0); // 모델을 공중으로 이동
      vrm.scene.rotation.y = Math.PI;
      scene.add(vrm.scene);
      currentVrm = vrm;
      window.currentVrm = vrm;

      // 새 VRM 모델 로드 시 메쉬 목록 업데이트
      if (window.createMeshList) {
        window.createMeshList();
      }

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
      window.loadAnimationFile('assets/Animation/VRMA_02.vrma');

      // 모델을 바닥으로 떨어뜨리는 애니메이션 시작
      await animateVrmDrop(vrm, 0.5, 3.0, -0.6); // 0.5초 동안 3.0에서 -0.6으로 이동

      // 3초 후 VRMA_03.vrma 재생
      setTimeout(() => {
        window.loadAnimationFile('assets/Animation/VRMA_03.vrma');
      }, 3000);
      
      // Set default Expression
      window.expressionMap = vrm.expressionManager.expressionMap;

      // VRM 모델의 표정 목록을 가져와 window.vrmExpressionList에 할당
      if (vrm.expressionManager) {
        window.vrmExpressionList = Object.keys(vrm.expressionManager.expressionMap);
      }
    })
    .catch((error: unknown) => {
      console.error('VRM 로드 실패:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`VRM 모델 로드에 실패했습니다: ${message}`);
    });
}

// 초기 모델 로드
loadVRM('assets/VRM/Liqu.vrm');

const loadVrmButton = document.getElementById('load-vrm-button');
if (loadVrmButton) {
  loadVrmButton.onclick = async () => {
    const filePath = await window.electronAPI.openVrmFile();
    if (filePath) {
      const url = `file://${filePath.replace(/\\/g, '/')}`;
      loadVRM(url);
    }
  };
}

// 포즈 저장 버튼 로직
const savePoseButton = document.getElementById('save-pose-button');
if (savePoseButton) {
  savePoseButton.onclick = () => {
    if (!currentVrm) {
      alert('VRM 모델이 로드되지 않았습니다.');
      return;
    }

    // 1. Get the current pose from the VRM model.
    const pose: VRMPose = currentVrm.humanoid.getNormalizedPose();

    // 2. Export the pose as a JSON Blob and save it.
    const jsonString = JSON.stringify(pose, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a temporary URL to pass to the main process for saving
    const reader = new FileReader();
    reader.onload = async (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
            const result = await window.electronAPI.saveVrmaPose(event.target.result);
            if (result.success) {
                console.log(`Pose saved successfully: ${result.message}`);
            } else if (result.message !== 'Save operation canceled.') {
                console.error(`Failed to save pose: ${result.message}`);
            }
        } else {
            console.error('Failed to read blob as ArrayBuffer.');
            alert('포즈 파일 변환에 실패했습니다.');
        }
    };
    reader.onerror = (error) => {
        console.error('FileReader error:', error);
    };
    reader.readAsArrayBuffer(blob);
  };
}

// 포즈 불러오기 (파일) 버튼 로직
const loadPoseFileButton = document.getElementById('load-pose-file-button');
if (loadPoseFileButton) {
  loadPoseFileButton.onclick = async () => {
    const filePath = await window.electronAPI.openVrmaFile();
    if (filePath) {
      const url = `file://${filePath.replace(/\\/g, '/')}`;
      window.loadAnimationFile(url);
    }
  };
}

      document.getElementById('open-pose-panel-button').onclick = async () => {
        const poseSidePanel = document.getElementById('pose-side-panel');
        if (poseSidePanel.style.display === 'flex') {
          poseSidePanel.style.display = 'none';
        } else {
          poseSidePanel.style.display = 'flex';
          // The list will be populated by renderer.ts
          try {
            const result = await window.electronAPI.listDirectory('assets/Pose');
            console.log('listDirectory result for assets/Pose:', result);
            if (result.error) {
              throw new Error(result.error);
            }
            const vrmaFiles = result.files.filter((file: string) => file.endsWith('.vrma'));
            console.log('Filtered VRMA files:', vrmaFiles);
            
            const poseListDisplay = document.getElementById('pose-list-display');
            if (poseListDisplay) {
              poseListDisplay.innerHTML = ''; // Clear previous list
              if (vrmaFiles.length === 0) {
                const noFilesMessage = document.createElement('p');
                noFilesMessage.textContent = '저장된 포즈 파일(.vrma)이 없습니다.';
                noFilesMessage.style.color = 'white';
                poseListDisplay.appendChild(noFilesMessage);
              } else {
                vrmaFiles.forEach((file: string) => {
                  const button = document.createElement('button');
                  button.textContent = file;
                  Object.assign(button.style, {
                    padding: '10px 15px', backgroundColor: 'transparent', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer',
                    marginBottom: '8px', width: '100%', textAlign: 'left',
                    fontSize: '1rem', transition: 'background-color 0.2s ease'
                  });
                  button.onmouseover = () => { button.style.backgroundColor = 'rgba(0,123,255,0.2)'; };
                  button.onmouseout = () => { button.style.backgroundColor = 'transparent'; };
                  button.onclick = () => {
                    const fullPath = `assets/Pose/${file}`;
                    window.loadAnimationFile(fullPath);
                  };
                  poseListDisplay.appendChild(button);
                });
              }
            }
          } catch (error) {
            console.error('Failed to list VRMA poses for panel:', error);
            alert('포즈 목록을 불러오는 데 실패했습니다.');
          }
        }
      };

      document.getElementById('open-animation-panel-button').onclick = async () => {
        const animationSidePanel = document.getElementById('animation-side-panel');
        if (animationSidePanel.style.display === 'flex') {
          animationSidePanel.style.display = 'none';
        } else {
          animationSidePanel.style.display = 'flex';
          try {
            const result = await window.electronAPI.listDirectory('assets/Animation');
            if (result.error) {
              throw new Error(result.error);
            }
            const vrmaFiles = result.files.filter(file => file.endsWith('.vrma') || file.endsWith('.fbx'));
            
            const animationListDisplay = document.getElementById('animation-list-display');
            if (animationListDisplay) {
              animationListDisplay.innerHTML = ''; // Clear previous list
              if (vrmaFiles.length === 0) {
                const noFilesMessage = document.createElement('p');
                noFilesMessage.textContent = '저장된 애니메이션 파일(.vrma)이 없습니다.';
                noFilesMessage.style.color = 'white';
                animationListDisplay.appendChild(noFilesMessage);
              } else {
                vrmaFiles.forEach((file: string) => {
                  const button = document.createElement('button');
                  button.textContent = file;
                  Object.assign(button.style, {
                    padding: '10px 15px', backgroundColor: 'transparent', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer',
                    marginBottom: '8px', width: '100%', textAlign: 'left',
                    fontSize: '1rem', transition: 'background-color 0.2s ease'
                  });
                  button.onmouseover = () => { button.style.backgroundColor = 'rgba(0,123,255,0.2)'; };
                  button.onmouseout = () => { button.style.backgroundColor = 'transparent'; };
                  button.onclick = () => {
                    const fullPath = `assets/Animation/${file}`;
                    window.loadAnimationFile(fullPath);
                  };
                  animationListDisplay.appendChild(button);
                });
              }
            }
          } catch (error) {
            console.error('Failed to list VRMA animations for panel:', error);
            alert('애니메이션 목록을 불러오는 데 실패했습니다.');
          }
        }
      };

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
    const startPosition = vrm.scene.position.y;

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
    pluginManager.update(delta, currentVrm);
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

function updateJointSliders() {
  if (!currentVrm) return;
  const slidersContainer = document.getElementById('joint-sliders');
  if (!slidersContainer) return;
  Object.values(VRMHumanBoneName).forEach(boneName => {
    const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    if (bone) {
      const boneControl = slidersContainer.querySelector(`div[data-bone-name="${boneName}"]`);
      if (boneControl) {
        const currentEuler = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
        ['x', 'y', 'z'].forEach(axis => {
          const slider = boneControl.querySelector<HTMLInputElement>(`.slider-${axis}`);
          if (slider) {
            slider.value = THREE.MathUtils.radToDeg(currentEuler[axis as 'x' | 'y' | 'z']).toFixed(0);
          }
        });
      }
    }
  });
}

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

    // Update the slider for the current expression
    const slider = document.querySelector<HTMLInputElement>(`#expression-sliders [data-expression-name="${expressionName}"] .expression-slider`);
    if (slider) {
      slider.value = (currentWeight * 100).toFixed(0);
    }

    // Reset other expressions to 0 and update their sliders
    // Iterate over expressionMap keys to ensure consistency with slider data attributes
    for (const name in expressionManager.expressionMap) {
      if (name !== expressionName) {
        expressionManager.setValue(name, 0.0);
        const slider = document.querySelector<HTMLInputElement>(`#expression-sliders [data-expression-name="${name}"] .expression-slider`);
        if (slider) {
          slider.value = '0';
        }
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
    console.error(`Additive Expression \"${expressionName}\" not found in the VRM model.`);
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

    // Update the slider for the current expression
    const slider = document.querySelector<HTMLInputElement>(`#expression-sliders [data-expression-name=\"${expressionName}\"] .expression-slider`);
    if (slider) {
      slider.value = (currentWeight * 100).toFixed(0);
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}
window.animateExpressionAdditive = animateExpressionAdditive;



const randomPoseButton = document.getElementById('random-pose-button');
if (randomPoseButton) {
  randomPoseButton.onclick = () => {
    if (currentVrm) {
      Object.values(VRMHumanBoneName).forEach(boneName => {
        const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
        if (bone && boneName !== VRMHumanBoneName.Head) {
          const randomQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
            (Math.random() - 0.5) * Math.PI / 2,
            (Math.random() - 0.5) * Math.PI / 2,
            (Math.random() - 0.5) * Math.PI / 2
          ));
          bone.quaternion.copy(randomQuaternion);
        }
      });
    }
  };
}

let audioContext: AudioContext | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;

function initAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e);
    }
  }
}
document.body.addEventListener('click', initAudioContext, { once: true });

async function playTTS(text: string) {
  if (!text || !audioContext) return;
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
    source.connect(audioContext.destination);
    source.start(0);
    currentAudioSource = source;
    source.onended = () => { currentAudioSource = null; };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn("TTS server is not running. Skipping TTS playback.");
    } else {
      console.error("TTS playback error:", error);
    }
  }
}
window.playTTS = playTTS;

function createJointSliders() {
  if (!currentVrm) return;
  const slidersContainer = document.getElementById('joint-sliders');
  if (!slidersContainer) return;
  slidersContainer.innerHTML = '';
  Object.values(VRMHumanBoneName).forEach(boneName => {
    const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    if (bone) {
      const boneControl = document.createElement('div');
      boneControl.style.marginBottom = '15px';
      boneControl.setAttribute('data-bone-name', boneName);
      const label = document.createElement('label');
      label.textContent = boneName;
      label.style.display = 'block';
      boneControl.appendChild(label);
      ['x', 'y', 'z'].forEach(axis => {
        const sliderContainer = document.createElement('div');
        sliderContainer.style.display = 'flex';
        const axisLabel = document.createElement('span');
        axisLabel.textContent = axis.toUpperCase();
        sliderContainer.appendChild(axisLabel);
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '-180';
        slider.max = '180';
        const currentEuler = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
        slider.value = THREE.MathUtils.radToDeg(currentEuler[axis as 'x' | 'y' | 'z']).toFixed(0);
        slider.oninput = () => {
          const x = (boneControl.querySelector('.slider-x') as HTMLInputElement).value;
          const y = (boneControl.querySelector('.slider-y') as HTMLInputElement).value;
          const z = (boneControl.querySelector('.slider-z') as HTMLInputElement).value;
          const euler = new THREE.Euler(
            THREE.MathUtils.degToRad(parseFloat(x)),
            THREE.MathUtils.degToRad(parseFloat(y)),
            THREE.MathUtils.degToRad(parseFloat(z)),
            'XYZ'
          );
          bone.setRotationFromEuler(euler);
        };
        slider.className = `slider-${axis}`;
        sliderContainer.appendChild(slider);
        boneControl.appendChild(sliderContainer);
      });

      // 초기화 버튼 추가
      const resetButton = document.createElement('button');
      resetButton.textContent = '초기화';
      Object.assign(resetButton.style, {
        marginTop: '5px',
        padding: '5px 10px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.8rem',
      });
      resetButton.onclick = () => {
        if (bone) {
          bone.quaternion.set(0, 0, 0, 1); // 쿼터니언 초기화 (회전 없음)
          // 슬라이더 값도 초기화된 값으로 업데이트
          const resetEuler = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
          ['x', 'y', 'z'].forEach(axis => {
            const slider = boneControl.querySelector<HTMLInputElement>(`.slider-${axis}`);
            if (slider) {
              slider.value = THREE.MathUtils.radToDeg(resetEuler[axis as 'x' | 'y' | 'z']).toFixed(0);
            }
          });
        }
      };
      boneControl.appendChild(resetButton);

      slidersContainer.appendChild(boneControl);
    }
  });
}
window.createJointSliders = createJointSliders;

/**
 * 현재 로드된 VRM 모델의 모든 메시 이름을 배열로 반환합니다.
 * @returns 메시 이름 배열
 */
window.listVrmMeshes = function(): string[] {
  if (!currentVrm) {
    console.warn('VRM model not loaded. Cannot list meshes.');
    return [];
  }
  const meshNames: string[] = [];
  currentVrm.scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      meshNames.push(object.name);
    }
  });
  return meshNames;
};

/**
 * 특정 이름의 VRM 메시의 가시성을 토글합니다.
 * @param meshName 토글할 메시의 이름
 * @param visible 메시를 보이게 할지 숨기게 할지 여부
 */
window.toggleVrmMeshVisibility = function(meshName: string, visible: boolean): void {
  if (!currentVrm) {
    console.warn('VRM model not loaded. Cannot toggle mesh visibility.');
    return;
  }
  let found = false;
  currentVrm.scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh && object.name === meshName) {
      object.visible = visible;
      found = true;
      console.log(`Mesh '${meshName}' visibility set to ${visible}`);
    }
  });
  if (!found) {
    console.warn(`Mesh '${meshName}' not found in VRM model.`);
  }
};

function logVrmBoneNames() {
  if (!currentVrm) return;
  console.log('--- VRM Humanoid Bone Names ---');
  Object.entries(currentVrm.humanoid.humanBones).forEach(([boneName, bone]) => {
    if (bone?.node) console.log(`HumanBoneName: ${boneName}, Node Name: ${bone.node.name}`);
  });
  console.log('-------------------------------');
}
window.logVrmBoneNames = logVrmBoneNames;

async function loadAnimationFile(filePath: string, options: { loop?: boolean; crossFadeDuration?: number } = {}) {
  if (!currentVrm || !mixer) return;

  // loop의 기본값을 false로 설정합니다.
  const { loop = false, crossFadeDuration = 0.5 } = options;

  const relativePath = filePath.startsWith('file://') ? filePath.substring(7).replace(/\\/g, '/').replace(process.cwd().replace(/\\/g, '/'), '').replace(/^\//, '') : filePath;

  let newClip: THREE.AnimationClip | null = null;

  try {
    if (relativePath.endsWith('.vrma')) {
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(relativePath, resolve, undefined, reject);
      });

      if (gltf.animations && gltf.animations.length > 0) {
        newClip = createVRMAnimationClip(gltf.userData.vrmAnimations[0], currentVrm);
      } else {
        const fileContent = await window.electronAPI.readFileContent(relativePath);
        if (typeof fileContent === 'object' && 'error' in fileContent) throw new Error(fileContent.error);
        const poseData = JSON.parse(new TextDecoder().decode(fileContent as ArrayBuffer)) as VRMPose;
        if (!poseData) throw new Error('Invalid VRMPose data structure.');

        // 포즈 적용 시, 현재 애니메이션을 정지하고 포즈를 설정합니다.
        if (currentAction) {
          currentAction.stop();
          currentAction = null;
        }
        mixer.stopAllAction(); // Ensure all actions are stopped before applying a pose
        currentVrm.humanoid.setNormalizedPose(poseData);
        currentVrm.scene.updateMatrixWorld(true);
        createJointSliders();
        console.log(`Loaded VRMA as JSON pose from ${relativePath}`);
        return;
      }
    } else if (relativePath.endsWith('.fbx')) {
      const fileContent = await window.electronAPI.readFileContent(relativePath);
      if (typeof fileContent === 'object' && 'error' in fileContent) throw new Error(fileContent.error);
      const fbx = fbxLoader.parse(fileContent as ArrayBuffer, '');
      if (fbx.animations && fbx.animations.length > 0) {
        newClip = fbx.animations[0];
      }
    }

    if (!newClip) {
      console.warn(`No animation clip could be loaded from ${relativePath}`);
      return;
    }

    const newAction = mixer.clipAction(newClip);
    newAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 0);
    if (!loop) {
      newAction.clampWhenFinished = true;
    }

    if (currentAction && currentAction !== newAction) {
      // 현재 재생 중인 액션이 있으면 부드럽게 전환합니다.
      currentAction.crossFadeTo(newAction, crossFadeDuration, true);
      newAction.play();
    } else {
      // 현재 재생 중인 액션이 없으면 그냥 재생합니다.
      newAction.play();
    }

    // 새로운 액션을 현재 액션으로 설정합니다.
    currentAction = newAction;

    console.log(`Loaded animation from ${relativePath} with crossfade.`);

  } catch (error) {
    console.error(`Error loading animation file from ${relativePath}:`, error);
    alert(`애니메이션 파일 로딩에 실패했습니다: ${(error as Error).message}`);
  }
}
window.loadAnimationFile = loadAnimationFile;

function createExpressionSliders() {
  if (!window.currentVrm || !window.currentVrm.expressionManager) {
    console.warn('createExpressionSliders: currentVrm or expressionManager is not available. Returning.');
    return;
  }
  const slidersContainer = document.getElementById('expression-sliders');
  if (!slidersContainer) {
    console.warn('createExpressionSliders: slidersContainer not found. Returning.');
    return;
  }
  slidersContainer.innerHTML = ''; // Clear previous sliders

  const expressionManager = window.currentVrm.expressionManager;
  const expressionMap = expressionManager.expressionMap;

  if (!expressionMap || Object.keys(expressionMap).length === 0) {
    console.warn('createExpressionSliders: No expressions found in VRM model. Returning.');
    return;
  }

  // `expressionMap`'s keys are the correct names for `setValue`
  for (const expressionName in expressionMap) {
    const expressionControl = document.createElement('div');
    expressionControl.style.marginBottom = '15px';
    expressionControl.setAttribute('data-expression-name', expressionName);

    const label = document.createElement('label');
    label.textContent = expressionName;
    label.style.display = 'block';
    expressionControl.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100'; // 0.0 to 1.0, so 0 to 100 for slider
    const initialValue = expressionManager.getValue(expressionName) || 0;
    slider.value = (initialValue * 100).toFixed(0);

    slider.oninput = () => {
      const weight = parseFloat(slider.value) / 100;
      // The key from expressionMap is the correct one to use.
      expressionManager.setValue(expressionName, weight);
      expressionManager.update();
    };
    slider.className = 'expression-slider';
    expressionControl.appendChild(slider);
    slidersContainer.appendChild(expressionControl);
  }
}
window.createExpressionSliders = createExpressionSliders;
    
    