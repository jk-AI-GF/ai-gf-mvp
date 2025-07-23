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
import { VRMLoaderPlugin, VRM, VRMHumanBoneName, VRMPose } from '@pixiv/three-vrm';
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

      // window.logVrmBoneNames();

      window.loadVrmPose = (pose: any) => {
        if (!currentVrm || !pose) return;
        currentVrm.humanoid.setNormalizedPose(pose);
        currentVrm.scene.updateMatrixWorld(true);
        createJointSliders();
      };

      if (vrm.expressionManager) {
        console.log('VRM ExpressionManager initialized.', vrm.expressionManager);
        const expressionMap: { [key: string]: string } = {};
        const llmExpressionList: string[] = [];

        vrm.expressionManager.expressions.forEach(exp => {
            expressionMap[exp.name] = exp.name;
            llmExpressionList.push(exp.name);
        });

        window.vrmExpressionList = llmExpressionList;
        window.expressionMap = expressionMap;
        console.log('VRM Expression List (Mapped for LLM):', window.vrmExpressionList);
        console.log('Actual VRM Expressions:', vrm.expressionManager.expressions.map(exp => exp.name));
      } else {
        console.warn('VRM ExpressionManager is not available on this VRM model.');
      }

      mixer = new THREE.AnimationMixer(vrm.scene);

      // 애니메이션 버튼 생성 로직
      const animationButtonsContainer = document.getElementById('animation-buttons');
      console.log('animationButtonsContainer:', animationButtonsContainer);
      if (animationButtonsContainer && window.vrmAnimationList && window.currentVrm && window.mixer) {
        console.log('Creating animation buttons...');
        window.vrmAnimationList.forEach((clip, index) => {
          const button = document.createElement('button');
          button.textContent = clip.name || `Animation ${index}`;
          button.style.margin = '5px';
          button.style.padding = '10px';
          button.style.backgroundColor = '#007bff';
          button.style.color = 'white';
          button.style.border = 'none';
          button.style.borderRadius = '5px';
          button.style.cursor = 'pointer';

          button.onclick = () => {
            window.mixer.stopAllAction(); // 기존 애니메이션 중지
            const action = window.mixer.clipAction(clip);
            action.play();
            console.log(`Applied animation: ${clip.name || `Animation ${index}`}`);
          };
          animationButtonsContainer.appendChild(button);
          console.log(`Button created for: ${clip.name || `Animation ${index}`}`);
        });
      } else {
        console.warn('Animation list or VRM model/mixer not ready for animation buttons.', { animationButtonsContainer, vrmAnimationList: window.vrmAnimationList, currentVrm: window.currentVrm, mixer: window.mixer });
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
      window.loadVrmaFile(url);
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
            if (result.error) {
              throw new Error(result.error);
            }
            const vrmaFiles = result.files.filter(file => file.endsWith('.vrma'));
            
            const poseListDisplay = document.getElementById('pose-list-display');
            if (poseListDisplay) {
              poseListDisplay.innerHTML = ''; // Clear previous list
              if (vrmaFiles.length === 0) {
                const noFilesMessage = document.createElement('p');
                noFilesMessage.textContent = '저장된 포즈 파일(.vrma)이 없습니다.';
                noFilesMessage.style.color = 'white';
                poseListDisplay.appendChild(noFilesMessage);
              } else {
                vrmaFiles.forEach(file => {
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
                    window.loadVrmaFile(fullPath);
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
  
  console.log(`animateExpression called: expressionName=${expressionName}, targetWeight=${targetWeight}, duration=${duration}`);
  console.log(`Mapped vrmInternalName: ${vrmInternalName}`);
  console.log('ExpressionManager object:', expressionManager);

  // Ensure the target expression exists
  const targetExpression = expressionManager.getExpression(vrmInternalName);
  if (!targetExpression) {
    console.error(`Expression "${vrmInternalName}" not found in the VRM model.`);
    return;
  }
  console.log(`Target expression found: ${targetExpression.name}`);

  const startWeight = expressionManager.getValue(vrmInternalName) || 0.0;
  const startTime = performance.now();

  console.log(`Initial weight for ${vrmInternalName}: ${startWeight}`);

  // Reset other expressions to 0
  expressionManager.expressions.forEach(exp => {
    if (exp.name !== vrmInternalName) {
      expressionManager.setValue(exp.name, 0.0);
    }
  });

  function step(currentTime: number) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / (duration * 1000), 1);
    const currentWeight = startWeight + (targetWeight - startWeight) * progress;
    
    console.log(`Before setValue, ${vrmInternalName} weight: ${expressionManager.getValue(vrmInternalName)?.toFixed(3)}`);
    expressionManager.setValue(vrmInternalName, currentWeight);
    console.log(`After setValue, ${vrmInternalName} weight: ${expressionManager.getValue(vrmInternalName)?.toFixed(3)}`);
    expressionManager.update();

    console.log(`Updating ${vrmInternalName} to weight: ${currentWeight.toFixed(3)}. Current actual weight: ${expressionManager.getValue(vrmInternalName)?.toFixed(3)}`);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}
window.animateExpression = animateExpression;



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

async function loadVrmaFile(vrmaPath: string) {
  if (!currentVrm || !mixer) return;

  try {
    // Try loading as GLTF first
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(
        vrmaPath,
        resolve,
        undefined,
        reject
      );
    });

    if (gltf.animations && gltf.animations.length > 0) {
      const clip = createVRMAnimationClip(gltf.userData.vrmAnimations[0], currentVrm);
      
      mixer.stopAllAction();
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1); // Assuming animations are not looped by default
      action.clampWhenFinished = true;
      action.play();
      console.log(`Loaded VRMA as animation from ${vrmaPath}`);
    } else {
      // If GLTF loaded but no animations, it might be a JSON pose or an empty GLTF
      throw new Error('No animation clips found in GLTF, trying as JSON pose.');
    }
  } catch (gltfError) {
    console.warn(`Failed to load VRMA as GLTF: ${(gltfError as Error).message}. Trying as JSON pose.`);
    try {
      // If GLTF loading fails, try loading as JSON VRMPose
      const response = await fetch(vrmaPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const poseData = await response.json() as VRMPose;

      if (!poseData) {
        throw new Error('Invalid VRMPose data structure in the loaded file.');
      }

      currentVrm.humanoid.setNormalizedPose(poseData);
      currentVrm.scene.updateMatrixWorld(true);
      createJointSliders();
      console.log(`Loaded VRMA as JSON pose from ${vrmaPath}`);
    } catch (jsonError) {
      console.error(`Error loading VRMA file from ${vrmaPath}:`, jsonError);
      alert(`VRMA 파일 로딩에 실패했습니다: ${(jsonError as Error).message}`);
    }
  }
}
window.loadVrmaFile = loadVrmaFile;