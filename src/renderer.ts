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
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';


const mixamoVRMRigMap = {
    mixamorigHips: 'hips',
    mixamorigSpine: 'spine',
    mixamorigSpine1: 'chest',
    mixamorigSpine2: 'upperChest',
    mixamorigNeck: 'neck',
    mixamorigHead: 'head',
    mixamorigLeftShoulder: 'leftShoulder',
    mixamorigLeftArm: 'leftUpperArm',
    mixamorigLeftForeArm: 'leftLowerArm',
    mixamorigLeftHand: 'leftHand',
    mixamorigLeftHandThumb1: 'leftThumbProximal',
    mixamorigLeftHandThumb2: 'leftThumbIntermediate',
    mixamorigLeftHandThumb3: 'leftThumbDistal',
    mixamorigLeftHandIndex1: 'leftIndexProximal',
    mixamorigLeftHandIndex2: 'leftIndexIntermediate',
    mixamorigLeftHandIndex3: 'leftIndexDistal',
    mixamorigLeftHandMiddle1: 'leftMiddleProximal',
    mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
    mixamorigLeftHandMiddle3: 'leftMiddleDistal',
    mixamorigLeftHandRing1: 'leftRingProximal',
    mixamorigLeftHandRing2: 'leftRingIntermediate',
    mixamorigLeftHandRing3: 'leftRingDistal',
    mixamorigLeftHandPinky1: 'leftLittleProximal',
    mixamorigLeftHandPinky2: 'leftLittleIntermediate',
    mixamorigLeftHandPinky3: 'leftLittleDistal',
    mixamorigRightShoulder: 'rightShoulder',
    mixamorigRightArm: 'rightUpperArm',
    mixamorigRightForeArm: 'rightLowerArm',
    mixamorigRightHand: 'rightHand',
    mixamorigRightHandThumb1: 'rightThumbProximal',
    mixamorigRightHandThumb2: 'rightThumbIntermediate',
    mixamorigRightHandThumb3: 'rightThumbDistal',
    mixamorigRightHandIndex1: 'rightIndexProximal',
    mixamorigRightHandIndex2: 'rightIndexIntermediate',
    mixamorigRightHandIndex3: 'rightIndexDistal',
    mixamorigRightHandMiddle1: 'rightMiddleProximal',
    mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
    mixamorigRightHandMiddle3: 'rightMiddleDistal',
    mixamorigRightHandRing1: 'rightRingProximal',
    mixamorigRightHandRing2: 'rightRingIntermediate',
    mixamorigRightHandRing3: 'rightRingDistal',
    mixamorigRightHandPinky1: 'rightLittleProximal',
    mixamorigRightHandPinky2: 'rightLittleIntermediate',
    mixamorigRightHandPinky3: 'rightLittleDistal',
    mixamorigLeftUpLeg: 'leftUpperLeg',
    mixamorigLeftLeg: 'leftLowerLeg',
    mixamorigLeftFoot: 'leftFoot',
    mixamorigLeftToeBase: 'leftToes',
    mixamorigRightUpLeg: 'rightUpperLeg',
    mixamorigRightLeg: 'rightLowerLeg',
    mixamorigRightFoot: 'rightFoot',
    mixamorigRightToeBase: 'rightToes',
};


let mixer: THREE.AnimationMixer; // mixer 변수 선언
let currentVrm: VRM | null = null; // 현재 로드된 VRM 모델을 저장할 변수
let controls: OrbitControls | null = null; // OrbitControls 변수 선언 및 null 초기화

const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
camera.position.set(0.0, 0.8, 3.19);
camera.rotation.set(-0.08, 0.0, 0.0);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1);
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
    vrm.scene.position.set(0, 0, 0);
    vrm.scene.rotation.y = Math.PI; // Y축을 기준으로 180도 회전 (PI 라디안)
    scene.add(vrm.scene);
    currentVrm = vrm; // 현재 VRM 모델 저장
    (window as any).currentVrm = vrm; // currentVrm을 window 객체에 노출

    // 포즈 저장/로드 함수를 window 객체에 노출
    (window as any).saveVrmPose = () => {
      if (!currentVrm) return null;
      const pose: { [key: string]: { position: number[], quaternion: number[], scale: number[] } } = {};
      Object.values(currentVrm.humanoid.humanBones).forEach((bone: any) => {
        if (bone.node) {
          pose[bone.node.name] = {
            position: bone.node.position.toArray(),
            quaternion: bone.node.quaternion.toArray(),
            scale: bone.node.scale.toArray(),
          };
        }
      });
      console.log('VRM Pose Saved:', pose);
      return pose;
    };

    (window as any).loadVrmPose = (pose: { [key: string]: { position: number[], quaternion: number[], scale: number[] } }) => {
      if (!currentVrm || !pose) return;
      Object.values(currentVrm.humanoid.humanBones).forEach((bone: any) => {
        if (bone.node && pose[bone.node.name]) {
          const saved = pose[bone.node.name];
          bone.node.position.fromArray(saved.position);
          bone.node.quaternion.fromArray(saved.quaternion);
          bone.node.scale.fromArray(saved.scale);
        }
      });
      console.log('VRM Pose Loaded.');
    };

    // VRM 모델의 표정 목록을 전역 변수로 노출
      if (vrm.expressionManager) {
        const actualExpressionNames: string[] = [];
        vrm.expressionManager.expressions.forEach((expressionObj, key) => {
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

        (window as any).expressionMap = expressionMap; // expressionMap을 window 객체에 노출
        console.log('VRM Expression List (Mapped for LLM):', window.vrmExpressionList);
        console.log('Type of vrm.expressionManager.expressions:', typeof vrm.expressionManager.expressions);
      }

    // 애니메이션 믹서 생성
    mixer = new THREE.AnimationMixer(vrm.scene);

    // VRM 모델에 애니메이션 클립이 있다면 재생
    console.log('GLTF Animations Length:', gltf.animations.length); // 이 줄을 추가합니다.
    (window as any).vrmAnimationList = gltf.animations; // 애니메이션 클립을 window 객체에 노출

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
    currentVrm.update(delta); // VRM 모델 업데이트 추가
  }

  if (controls) {
    controls.update();
  }

  renderer.render(scene, camera);
}
animate();

console.log('👋 VRM 오버레이 로딩 완료');


