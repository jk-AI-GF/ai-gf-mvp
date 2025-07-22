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


let mixer: THREE.AnimationMixer; // mixer 변수 선언
let currentVrm: VRM | null = null; // 현재 로드된 VRM 모델을 저장할 변수
let controls: OrbitControls | null = null; // OrbitControls 변수 선언 및 null 초기화

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

const ambientLight = new THREE.AmbientLight(0x404040, 2); // 부드러운 주변광 추가
scene.add(ambientLight);

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser)); // VRMLoaderPlugin 등록

loader.load(
  'Liqu.vrm',
  (gltf) => {
    const vrm = gltf.userData.vrm as VRM; // vrm에 VRM 타입 명시
    vrm.scene.position.set(0, -0.6, 0);
    vrm.scene.rotation.y = Math.PI; // Y축을 기준으로 180도 회전 (PI 라디안)
    scene.add(vrm.scene);
    currentVrm = vrm; // 현재 VRM 모델 저장
    window.currentVrm = vrm; // currentVrm을 window 객체에 노출

    // VRM 모델 로드 후 본 이름 목록을 로그
    logVrmBoneNames();

    // VRM 모델의 눈과 목이 카메라를 따라가도록 설정

    vrm.lookAt.target = camera;

    // 포즈 저장/로드 함수를 window 객체에 노출
    window.saveVrmPose = () => {
      if (!currentVrm) return null;
      const pose = currentVrm.humanoid.getNormalizedPose();
      if (pose[VRMHumanBoneName.Spine]) {
        console.log('VRM Pose Saved (Spine bone only):', {
          rotation: pose[VRMHumanBoneName.Spine].rotation,
          position: pose[VRMHumanBoneName.Spine].position,
        });
      } else {
        console.log('VRM Pose Saved: Spine bone data not found.');
      }
      return pose;
    };

    window.loadVrmPose = (pose: any) => {
      if (!currentVrm || !pose) return;
      if (pose[VRMHumanBoneName.Spine]) {
        console.log('Attempting to load pose (Spine bone only):', {
          rotation: pose[VRMHumanBoneName.Spine].rotation,
          position: pose[VRMHumanBoneName.Spine].position,
        });
      } else {
        console.log('Attempting to load pose: Spine bone data not found.');
      }
      currentVrm.humanoid.setNormalizedPose(pose);
      currentVrm.scene.updateMatrixWorld(true); // 씬의 월드 행렬 업데이트 강제
      console.log('VRM Pose Loaded.');
      createJointSliders(); // 포즈 로드 후 슬라이더 UI 갱신
    };

    // VRM 모델의 표정 목록을 전역 변수로 노출
      if (vrm.expressionManager) {
        const actualExpressionNames: string[] = [];
        vrm.expressionManager.expressions.forEach((expressionObj) => {
          // VRMExpression 객체의 name 속성을 사용
          actualExpressionNames.push(expressionObj.name);
        });
        console.log('Actual VRM Expression Names (from objects): ', actualExpressionNames);

        // 임시 매핑: 실제 VRM 모델의 표정 이름에 따라 수정해야 합니다.
        const expressionMap: { [key: string]: string } = {
          '기본': 'neutral',
          '아': 'aa',
          '이': 'ih',
          '우': 'ou',
          '에': 'ee',
          '오': 'oh',
          '눈감음': 'blink',
          '행복': 'happy',
          '화남': 'angry',
          '슬픔': 'sad',
          '편안': 'relaxed',
          '위보기': 'lookUp',
          '아래보기': 'lookDown',
          '왼쪽보기': 'lookLeft',
          '오른쪽보기': 'lookRight',
          '왼쪽눈감음': 'blinkLeft',
          '오른쪽눈감음': 'blinkRight',
          '하트': 'ハート',
          '반짝반짝': 'キラキラ',
          '메롱': 'あっかんべー',
          '째려보기': 'じとめ',
        };

        // LLM에 전달할 표정 목록 (한국어 이름)
        window.vrmExpressionList = Object.keys(expressionMap);

        window.expressionMap = expressionMap; // expressionMap을 window 객체에 노출
        console.log('VRM Expression List (Mapped for LLM):', window.vrmExpressionList);
        console.log('Type of vrm.expressionManager.expressions:', typeof vrm.expressionManager.expressions);
      }

    // 애니메이션 믹서 생성
    mixer = new THREE.AnimationMixer(vrm.scene);

    // VRM 모델에 애니메이션 클립이 있다면 재생
    console.log('GLTF Animations Length:', gltf.animations.length); // 이 줄을 추가합니다.
    window.vrmAnimationList = gltf.animations; // 애니메이션 클립을 window 객체에 노출

    // 디버그 로그 추가: VRM 모델의 바운딩 박스 확인
    vrm.scene.updateMatrixWorld(true); // 월드 행렬 업데이트
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log('VRM Model Bounding Box:', box);
    console.log('VRM Model Size:', size);
    console.log('VRM Model Center:', center);
    console.log('VRM Model Position:', vrm.scene.position);

    // 애니메이션 버튼 생성 및 이벤트 리스너 설정 (이 부분을 loader.load 콜백 안으로 이동)
    const animationButtonsContainer = document.getElementById('animation-buttons');
    if (animationButtonsContainer) {
      // 기존 애니메이션 파일 로딩 로직 제거

      // 디버그용 카메라 정보 로그 버튼 추가
      const debugButton = document.createElement('button');
      debugButton.textContent = 'Log Camera Info';
      debugButton.style.margin = '5px';
      debugButton.style.padding = '10px';
      debugButton.style.backgroundColor = '#28a745'; // Green color
      debugButton.style.color = 'white';
      debugButton.style.border = 'none';
      debugButton.style.borderRadius = '5px';
      debugButton.style.cursor = 'pointer';

      debugButton.onclick = () => {
        console.log('Camera Position:', camera.position);
        console.log('Camera Rotation:', camera.rotation);
      };
      animationButtonsContainer.appendChild(debugButton);
    }
  },
  undefined,
  (error) => {
    console.error('VRM 로드 실패:', error);
  }
);

const clock = new THREE.Clock(); // 애니메이션 업데이트를 위한 Clock 추가

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta(); // 이전 프레임과의 시간 차이 계산
  if (mixer) {
    mixer.update(delta);
  }

  if (currentVrm) {

    const head = currentVrm.humanoid.getNormalizedBoneNode('head');
    
    if (head) {
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);

      const headPos = new THREE.Vector3();
      head.getWorldPosition(headPos);

      const targetDir = new THREE.Vector3().subVectors(headPos, camPos).normalize();
      targetDir.y *= -1;
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), targetDir);

      // 현재 회전에서 목표 회전으로 부드럽게 이동
      head.quaternion.slerp(targetQuat, 0.1); // 0.1은 보간 비율, 더 작게 하면 더 느림
    }

    currentVrm.update(delta); // VRM 모델 업데이트 추가


    // 모든 SkinnedMesh의 스켈레톤 업데이트
    currentVrm.scene.traverse(object => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
        (object as THREE.SkinnedMesh).skeleton.update();
      }
    });

  }

  if (controls) {
    controls.update();
  }

  renderer.render(scene, camera);
}
animate();

console.log('👋 VRM 오버레이 로딩 완료');

function animateExpression(expressionName: string, targetWeight: number, duration: number) {
  if (!window.currentVrm || !window.currentVrm.expressionManager || !window.expressionMap) {
    console.warn('VRM model or expressionManager not ready for animation.');
    return;
  }

  const expressionManager = window.currentVrm.expressionManager;
  const startWeight = expressionManager.getValue(expressionName) || 0.0;
  const startTime = performance.now();

  // Reset all other expressions to 0 before starting the animation
  for (const mappedName in window.expressionMap) {
    const vrmInternalName = window.expressionMap[mappedName];
    if (vrmInternalName && vrmInternalName !== expressionName) {
      expressionManager.setValue(vrmInternalName, 0.0);
    }
  }

  function step(currentTime: number) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / (duration * 1000), 1); // progress from 0 to 1

    const currentWeight = startWeight + (targetWeight - startWeight) * progress;
    expressionManager.setValue(expressionName, currentWeight);
    expressionManager.update();

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

window.animateExpression = animateExpression; // Expose to window object

// 디버그용 표정 전환 버튼 로직 (점진적 변화 적용)
const smileDebugButton = document.getElementById('smile-debug-button');
if (smileDebugButton) {
  let currentDebugExpressionIndex = 0; // 디버그 버튼용 인덱스
  smileDebugButton.onclick = () => {
    if (window.currentVrm && window.currentVrm.expressionManager && window.vrmExpressionList && window.vrmExpressionList.length > 0 && window.expressionMap) {
      const nextMappedExpression = window.vrmExpressionList[currentDebugExpressionIndex];
      const nextInternalExpression = window.expressionMap[nextMappedExpression];

      if (nextInternalExpression) {
        // animateExpression 함수를 사용하여 표정을 점진적으로 변경
        window.animateExpression(nextInternalExpression, 1.0, 0.5); // 0.5초 동안 변경
        console.log(`Debug: Applied expression: ${nextMappedExpression} (Internal: ${nextInternalExpression}) with animation`);
      } else {
        console.warn(`Debug: Internal VRM expression name not found for mapped expression: ${nextMappedExpression}`);
      }

      currentDebugExpressionIndex = (currentDebugExpressionIndex + 1) % window.vrmExpressionList.length;
    } else {
      console.warn('Debug: VRM model or expression list/map not ready.');
    }
  };
}

// 디버그용 랜덤 포즈 버튼 로직
const randomPoseButton = document.getElementById('random-pose-button');
if (randomPoseButton) {
  randomPoseButton.onclick = () => {
    if (currentVrm) {
      // VRMHumanoid의 모든 본을 순회하며 무작위 회전 적용
      const boneNames = Object.keys(currentVrm.humanoid.humanBones);
      boneNames.forEach(boneName => {
        const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
        if (bone) {
          const randomQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
            (Math.random() - 0.5) * Math.PI / 2,
            (Math.random() - 0.5) * Math.PI / 2,
            (Math.random() - 0.5) * Math.PI / 2
          ));
          bone.setRotationFromQuaternion(randomQuaternion);
          bone.updateMatrixWorld(true); // 본의 월드 행렬 업데이트 강제
        } else {
          console.warn(`Bone node not found for: ${boneName}`);
        }
      });
      currentVrm.humanoid.update(); // 휴머노이드 업데이트
      currentVrm.scene.updateMatrixWorld(true); // 씬의 월드 행렬 업데이트 강제
      console.log('Applied random pose.');
      createJointSliders(); // 랜덤 포즈 적용 후 슬라이더 UI 갱신
    } else {
      console.warn('VRM model not ready for random pose.');
    }
  };
}


// --- TTS Integration Start ---

// 오디오 컨텍스트를 저장할 변수
let audioContext: AudioContext | null = null;
// 현재 재생 중인 오디오 소스를 저장할 변수
let currentAudioSource: AudioBufferSourceNode | null = null;

/**
 * 사용자의 첫 상호작용 시 오디오 컨텍스트를 초기화합니다.
 * 브라우저의 자동 재생 정책을 준수하기 위해 필요합니다.
 */
function initAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log("AudioContext initialized.");
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e);
    }
  }
}

// 사용자가 클릭이나 탭을 할 때 오디오 컨텍스트를 초기화하도록 이벤트 리스너를 추가합니다.
document.body.addEventListener('click', initAudioContext, { once: true });
document.body.addEventListener('touchend', initAudioContext, { once: true });


/**
 * 주어진 텍스트에 대한 TTS 오디오를 요청하고 재생합니다.
 * @param text 재생할 텍스트
 */
async function playTTS(text: string) {
  if (!text) {
    console.warn("TTS 요청 텍스트가 비어있습니다.");
    return;
  }

  // 오디오 컨텍스트가 초기화되었는지 확인합니다.
  if (!audioContext) {
    console.warn("AudioContext가 아직 초기화되지 않았습니다. 사용자의 상호작용이 필요합니다.");
    // 강제로 초기화를 시도할 수 있습니다.
    initAudioContext();
    if (!audioContext) {
        alert("오디오를 재생하려면 화면을 한 번 클릭해주세요.");
        return;
    }
  }

  // 이전에 재생 중이던 오디오가 있다면 중지합니다.
  if (currentAudioSource) {
    currentAudioSource.stop();
    currentAudioSource.disconnect();
    currentAudioSource = null;
    console.log("Previous audio stopped.");
  }

  console.log(`TTS 요청 전송: "${text}"`);

  try {
    // 백엔드 TTS API에 요청을 보냅니다.
    const response = await fetch('http://localhost:8000/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text, engine: 'gtts' }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`TTS API 오류: ${response.status} - ${errorData.detail || 'Unknown error'}`);
    }
    console.log("TTS API 응답 수신 완료. 오디오 데이터 처리 시작...");

    // 응답으로 받은 오디오 데이터를 ArrayBuffer로 변환합니다.
    const audioData = await response.arrayBuffer();
    console.log(`오디오 데이터 수신 완료 (크기: ${audioData.byteLength} 바이트). 디코딩 시작...`);

    // ArrayBuffer를 디코딩하여 오디오 버퍼로 만듭니다.
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    console.log("오디오 데이터 디코딩 완료.");

    // 오디오 버퍼 소스를 생성합니다.
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    // 오디오 재생을 시작합니다.
    source.start(0);
    console.log("오디오 재생 시작.");

    // 현재 오디오 소스를 추적합니다.
    currentAudioSource = source;

    // 오디오 재생이 끝나면 소스를 null로 설정합니다.
    source.onended = () => {
      console.log("오디오 재생 완료.");
      if (currentAudioSource === source) {
        currentAudioSource = null;
      }
      source.disconnect();
    };

  } catch (error) {
    console.error("TTS 오디오 재생 중 오류 발생:", error);
    // 사용자에게 오류를 알릴 수 있습니다.
    // alert(`TTS 오디오를 재생하는 데 실패했습니다: ${error.message}`);
  }
}

// 다른 스크립트에서 playTTS 함수를 사용할 수 있도록 window 객체에 노출합니다.
window.playTTS = playTTS;

// --- TTS Integration End ---

// --- Joint Control Start ---
function createJointSliders() {
  if (!currentVrm) return;

  const slidersContainer = document.getElementById('joint-sliders');
  if (!slidersContainer) return;

  // Clear existing sliders
  slidersContainer.innerHTML = '';

  Object.values(VRMHumanBoneName).forEach(boneName => {
    const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    if (bone) {
      const boneControl = document.createElement('div');
      boneControl.style.marginBottom = '15px';

      const label = document.createElement('label');
      label.textContent = boneName;
      label.style.display = 'block';
      label.style.marginBottom = '5px';
      boneControl.appendChild(label);

      ['x', 'y', 'z'].forEach(axis => {
        const sliderContainer = document.createElement('div');
        sliderContainer.style.display = 'flex';
        sliderContainer.style.alignItems = 'center';
        sliderContainer.style.marginBottom = '5px';

        const axisLabel = document.createElement('span');
        axisLabel.textContent = axis.toUpperCase();
        axisLabel.style.width = '20px';
        sliderContainer.appendChild(axisLabel);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '-180';
        slider.max = '180';
        // 현재 본의 해당 축 회전 값을 슬라이더 초기값으로 설정 (라디안을 도로 변환)
        const currentEuler = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
        slider.value = THREE.MathUtils.radToDeg(currentEuler[axis as 'x' | 'y' | 'z']).toFixed(0);
        slider.style.flexGrow = '1';
        slider.oninput = () => {
          const x = boneControl.querySelector<HTMLInputElement>('.slider-x').value;
          const y = boneControl.querySelector<HTMLInputElement>('.slider-y').value;
          const z = boneControl.querySelector<HTMLInputElement>('.slider-z').value;
          
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
// --- Joint Control End ---

// VRM 모델의 모든 본 이름을 콘솔에 로깅하는 함수
function logVrmBoneNames() {
  if (!currentVrm) {
    console.warn('VRM model not loaded. Cannot log bone names.');
    return;
  }

  console.log('--- VRM Humanoid Bone Names ---');
  Object.entries(currentVrm.humanoid.humanBones).forEach(([boneName, bone]) => {
    if (bone && bone.node) {
      console.log(`HumanBoneName: ${boneName}, Node Name: ${bone.node.name}`);
    } else {
      console.log(`HumanBoneName: ${boneName}, Node: (null or undefined)`);
    }
  });
  console.log('-------------------------------');
}

window.logVrmBoneNames = logVrmBoneNames; // window 객체에 노출




