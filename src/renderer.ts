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

let mixer: THREE.AnimationMixer;
let currentVrm: VRM | null = null;
let controls: OrbitControls | null = null;

if (!window.floatingMessages) {
  window.floatingMessages = [];
}
const tempVector = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
camera.position.set(0.0, 0.0, 3.0);
camera.rotation.set(-0.08, 0.0, 0.0);

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
      vrm.scene.position.set(0, -0.6, 0);
      vrm.scene.rotation.y = Math.PI;
      scene.add(vrm.scene);
      currentVrm = vrm;
      window.currentVrm = vrm;

      mixer = new THREE.AnimationMixer(vrm.scene);

      // Enable shadows for all meshes in the VRM model
      vrm.scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          object.castShadow = true;
        }
      });

      // Load default pose
      const defaultPosePath = 'assets/Pose/pose_stand_001.vrma';
      window.loadAnimationFile(defaultPosePath);
      
      // Set default Expression
      console.log(Object.keys(vrm.expressionManager.expressionMap));
      console.log(vrm.expressionManager.expressionMap);
      window.expressionMap = vrm.expressionManager.expressionMap;
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
  renderer.setClearColor(color, 1);
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
  if (!window.currentVrm || !window.currentVrm.expressionManager || !window.expressionMap) return;
  
  const expressionManager = window.currentVrm.expressionManager;
  
  // Ensure the target expression exists
  const targetExpression = expressionManager.getExpression(expressionName);
  if (!targetExpression) {
    console.error(`Expression "${expressionName}" not found in the VRM model.`);
    return;
  }

  const startWeight = expressionManager.getValue(expressionName) || 0.0;
  const startTime = performance.now();

  // Reset other expressions to 0
  expressionManager.expressions.forEach(exp => {
    if (exp.name !== expressionName) {
      expressionManager.setValue(exp.name, 0.0);
    }
  });

  function step(currentTime: number) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / (duration * 1000), 1);
    const currentWeight = startWeight + (targetWeight - startWeight) * progress;
    
    expressionManager.setValue(expressionName, currentWeight);
    expressionManager.update();

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

function logVrmBoneNames() {
  if (!currentVrm) return;
  console.log('--- VRM Humanoid Bone Names ---');
  Object.entries(currentVrm.humanoid.humanBones).forEach(([boneName, bone]) => {
    if (bone?.node) console.log(`HumanBoneName: ${boneName}, Node Name: ${bone.node.name}`);
  });
  console.log('-------------------------------');
}
window.logVrmBoneNames = logVrmBoneNames;

async function loadAnimationFile(filePath: string) {
  if (!currentVrm || !mixer) return;

  // Remove 'file://' prefix if present and convert to relative path
  const relativePath = filePath.startsWith('file://') ? filePath.substring(7).replace(/\\/g, '/').replace(process.cwd().replace(/\\/g, '/'), '').replace(/^\//, '') : filePath;

  if (relativePath.endsWith('.vrma')) {
    try {
      // Try loading as GLTF first
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          relativePath,
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
        console.log(`Loaded VRMA as animation from ${relativePath}`);
      } else {
        // If GLTF loaded but no animations, it might be a JSON pose or an empty GLTF
        throw new Error('No animation clips found in GLTF, trying as JSON pose.');
      }
    } catch (gltfError) {
      console.warn(`Failed to load VRMA as GLTF: ${(gltfError as Error).message}. Trying as JSON pose.`);
      try {
        // If GLTF loading fails, try loading as JSON VRMPose
        const fileContent = await window.electronAPI.readFileContent(relativePath);
        if (typeof fileContent === 'object' && 'error' in fileContent) {
          throw new Error(fileContent.error);
        }
        const poseData = JSON.parse(new TextDecoder().decode(fileContent as ArrayBuffer)) as VRMPose;

        if (!poseData) {
          throw new Error('Invalid VRMPose data structure in the loaded file.');
        }

        currentVrm.humanoid.setNormalizedPose(poseData);
        currentVrm.scene.updateMatrixWorld(true);
        createJointSliders();
        console.log(`Loaded VRMA as JSON pose from ${relativePath}`);
      } catch (jsonError) {
        console.error(`Error loading VRMA file from ${relativePath}:`, jsonError);
        alert(`VRMA 파일 로딩에 실패했습니다: ${(jsonError as Error).message}`);
      }
    }
  } else if (relativePath.endsWith('.fbx')) {
    try {
      const fileContent = await window.electronAPI.readFileContent(relativePath);
      if (typeof fileContent === 'object' && 'error' in fileContent) {
        throw new Error(fileContent.error);
      }
      const fbx = fbxLoader.parse(fileContent as ArrayBuffer, ''); // Pass empty path for parse
      
      if (fbx.animations && fbx.animations.length > 0) {
        mixer.stopAllAction();
        const action = mixer.clipAction(fbx.animations[0]);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        console.log(`Loaded FBX as animation from ${relativePath}`);
      } else {
        console.warn(`No animation clips found in FBX file: ${relativePath}`);
        alert(`FBX 파일에 애니메이션 클립이 없습니다: ${relativePath}`);
      }
    } catch (error) {
      console.error(`Error loading FBX file from ${relativePath}:`, error);
      alert(`FBX 파일 로딩에 실패했습니다: ${(error as Error).message}`);
    }
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

  const targetExpressions = window.currentVrm.expressionManager.expressions;

  if (targetExpressions.length === 0) {
    console.warn('createExpressionSliders: No expressions found in VRM model. Returning.');
    return;
  }

  targetExpressions.forEach(expression => {
    const expressionName = expression.name;
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
    const initialValue = window.currentVrm.expressionManager.getValue(expressionName) || 0;
    slider.value = (initialValue * 100).toFixed(0);

    slider.oninput = () => {
      const weight = parseFloat(slider.value) / 100;
      const presetName = expressionName.replace(/^VRMExpression_/, '') as VRMExpressionPresetName;

      window.currentVrm.expressionManager.setValue(presetName, weight);
      window.currentVrm.expressionManager.update();
    };
    slider.className = 'expression-slider';
    expressionControl.appendChild(slider);
    slidersContainer.appendChild(expressionControl);
  });
}
window.createExpressionSliders = createExpressionSliders;
    
    