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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMLoaderPlugin, VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { createVRMAnimationClip, VRMAnimation } from '@pixiv/three-vrm-animation';

let mixer: THREE.AnimationMixer;
let currentVrm: VRM | null = null;
let controls: OrbitControls | null = null;

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
camera.position.set(0.0, 0.0, 3.0);
camera.rotation.set(-0.08, 0.0, 0.0);

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(1, 0, 3);
scene.add(light);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(width, height);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

controls = new OrbitControls(camera, renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));
loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

function loadVRM(url: string) {
  // 이전에 로드된 모델이 있다면 씬에서 제거
  if (currentVrm) {
    scene.remove(currentVrm.scene);
    // VRMUtils.deepDispose(currentVrm.scene); // three-vrm 0.x 방식
    // For three-vrm 1.x, there is no built-in deepDispose.
    // We need to traverse and dispose manually if needed, but for now, just removing from scene is enough for basic cleanup.
    currentVrm = null;
  }

  loader.load(
    url,
    (gltf) => {
      const vrm = gltf.userData.vrm as VRM;
      vrm.scene.position.set(0, -0.6, 0);
      vrm.scene.rotation.y = Math.PI;
      scene.add(vrm.scene);
      currentVrm = vrm;
      window.currentVrm = vrm;

      window.logVrmBoneNames();

      window.saveVrmPose = () => {
        if (!currentVrm) return null;
        return currentVrm.humanoid.getNormalizedPose();
      };

      window.loadVrmPose = (pose: any) => {
        if (!currentVrm || !pose) return;
        currentVrm.humanoid.setNormalizedPose(pose);
        currentVrm.scene.updateMatrixWorld(true);
        createJointSliders();
      };

      if (vrm.expressionManager) {
        const expressionMap: { [key: string]: string } = {};
        vrm.expressionManager.expressions.forEach(exp => {
            expressionMap[exp.name] = exp.name; // 실제 표정 이름을 그대로 사용
        });
        
        // 한국어 매핑 (모델에 따라 커스터마이징 필요)
        const koExpressionMap: { [key: string]: string } = {
            '기본': 'neutral', '아': 'a', '이': 'i', '우': 'u', '에': 'e', '오': 'o',
            '눈감음': 'blink', '행복': 'happy', '화남': 'angry', '슬픔': 'sad',
            '편안': 'relaxed', '위보기': 'lookUp', '아래보기': 'lookDown',
            '왼쪽보기': 'lookLeft', '오른쪽보기': 'lookRight'
        };

        const finalExpressionMap: { [key: string]: string } = {};
        const llmExpressionList: string[] = [];

        for (const [ko, en] of Object.entries(koExpressionMap)) {
            if (expressionMap[en]) {
                finalExpressionMap[ko] = en;
                llmExpressionList.push(ko);
            }
        }
        
        // 모델에만 있는 추가적인 표정들도 리스트에 추가
        vrm.expressionManager.expressions.forEach(exp => {
            if (!Object.values(finalExpressionMap).includes(exp.name)) {
                finalExpressionMap[exp.name] = exp.name;
                llmExpressionList.push(exp.name);
            }
        });

        window.vrmExpressionList = llmExpressionList;
        window.expressionMap = finalExpressionMap;
        console.log('VRM Expression List (Mapped for LLM):', window.vrmExpressionList);
      }

      mixer = new THREE.AnimationMixer(vrm.scene);
      if (gltf.animations && gltf.animations.length > 0) {
        window.vrmAnimationList = gltf.animations;
      }
    },
    undefined,
    (error: unknown) => {
      console.error('VRM 로드 실패:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`VRM 모델 로드에 실패했습니다: ${message}`);
    }
  );
}

// 초기 모델 로드
loadVRM('assets/VRM/Liqu.vrm');

const loadVrmButton = document.getElementById('load-vrm-button');
if (loadVrmButton) {
  loadVrmButton.onclick = async () => {
    const filePath = await window.electronAPI.openVrmFile();
    if (filePath) {
      // Electron 경로를 웹 URL 형식으로 변환
      const url = `file://${filePath.replace(/\\/g, '/')}`;
      loadVRM(url);
    }
  };
}


const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (currentVrm) {
    const head = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
    if (head) {
      const headForward = new THREE.Vector3();
      head.getWorldDirection(headForward);
      headForward.negate();
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const headPos = new THREE.Vector3();
      head.getWorldPosition(headPos);
      const cameraDir = new THREE.Vector3().subVectors(camPos, headPos).normalize();
      const lookAtOffset = new THREE.Quaternion().setFromUnitVectors(headForward, cameraDir);
      const headWorldQuat = new THREE.Quaternion();
      head.getWorldQuaternion(headWorldQuat);
      const targetWorldQuat = new THREE.Quaternion().multiplyQuaternions(lookAtOffset, headWorldQuat);
      const parentWorldQuat = new THREE.Quaternion();
      head.parent.getWorldQuaternion(parentWorldQuat);
      const parentWorldQuatInverse = parentWorldQuat.clone().invert();
      const targetLocalQuat = targetWorldQuat.clone().premultiply(parentWorldQuatInverse);
      head.quaternion.slerp(targetLocalQuat, 0.1);
    }
    currentVrm.update(delta);
    currentVrm.scene.traverse(object => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
        (object as THREE.SkinnedMesh).skeleton.update();
      }
    });
  }
  if (controls) controls.update();
  updateJointSliders();
  renderer.render(scene, camera);
}
animate();

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
  if (!window.currentVrm || !window.currentVrm.expressionManager || !window.expressionMap) return;
  const expressionManager = window.currentVrm.expressionManager;
  const vrmInternalName = window.expressionMap[expressionName] || expressionName;
  const startWeight = expressionManager.getValue(vrmInternalName) || 0.0;
  const startTime = performance.now();
  
  // 다른 표정 초기화
  for (const name in window.expressionMap) {
      const internalName = window.expressionMap[name];
      if (internalName && internalName !== vrmInternalName) {
          expressionManager.setValue(internalName, 0.0);
      }
  }

  function step(currentTime: number) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / (duration * 1000), 1);
    const currentWeight = startWeight + (targetWeight - startWeight) * progress;
    expressionManager.setValue(vrmInternalName, currentWeight);
    expressionManager.update();
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
window.animateExpression = animateExpression;

const smileDebugButton = document.getElementById('smile-debug-button');
if (smileDebugButton) {
  let currentDebugExpressionIndex = 0;
  smileDebugButton.onclick = () => {
    if (window.currentVrm && window.vrmExpressionList?.length > 0) {
      const nextMappedExpression = window.vrmExpressionList[currentDebugExpressionIndex];
      window.animateExpression(nextMappedExpression, 1.0, 0.5);
      console.log(`Debug: Applied expression: ${nextMappedExpression}`);
      currentDebugExpressionIndex = (currentDebugExpressionIndex + 1) % window.vrmExpressionList.length;
    }
  };
}

const randomPoseButton = document.getElementById('random-pose-button');
if (randomPoseButton) {
  randomPoseButton.onclick = () => {
    if (currentVrm) {
      Object.values(VRMHumanBoneName).forEach(boneName => {
        const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
        if (bone && boneName !== VRMHumanBoneName.Head) { // 머리는 제외
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, engine: 'gtts' }),
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
    console.error("TTS playback error:", error);
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
      slidersContainer.appendChild(boneControl);
    }
  });
}
window.createJointSliders = createJointSliders;

function logVrmBoneNames() {
  if (!currentVrm) return;
  console.log('--- VRM Humanoid Bone Names ---');
  Object.entries(currentVrm.humanoid.humanBones).forEach(([boneName, bone]) => {
    if (bone?.node) console.log(`HumanBoneName: ${boneName}, Node Name: ${bone.node.name}`);
  });
  console.log('-------------------------------');
}
window.logVrmBoneNames = logVrmBoneNames;

async function loadVrmaPose(vrmaPath: string) {
  if (!currentVrm || !mixer) return;
  try {
    const vrmaLoader = new GLTFLoader();
    vrmaLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    const gltf = await vrmaLoader.loadAsync(vrmaPath);
    const vrmAnimation = gltf.userData.vrmAnimations[0] as VRMAnimation;
    if (!vrmAnimation) throw new Error('VRMAnimation data not found.');
    const clip = createVRMAnimationClip(vrmAnimation, currentVrm);
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.play();
  } catch (error) {
    console.error(`Error loading VRMA pose from ${vrmaPath}:`, error);
  }
}
window.loadVrmaPose = loadVrmaPose;