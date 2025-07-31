import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRM, VRMHumanBoneName, VRMPose } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';
import eventBus, { AppEvents, TypedEventBus } from '../core/event-bus';

type ParsedFile = { type: 'pose'; data: THREE.AnimationClip } | { type: 'animation'; data: THREE.AnimationClip } | null;

function createAnimationClipFromVRMPose(vrmPose: VRMPose, vrm: VRM): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];
    const duration = 0; // Pose clips have 0 duration
    for (const boneName in vrmPose) {
        const poseData = vrmPose[boneName as VRMHumanBoneName];
        if (!poseData) continue;

        const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
            if (!boneNode) continue;

            if (poseData.position) {
                const position = new THREE.Vector3().fromArray(poseData.position);
                tracks.push(new THREE.VectorKeyframeTrack(
                    `${boneNode.name}.position`,
                    [0],
                    position.toArray()
                ));
            }

            if (poseData.rotation) {
                const rotation = new THREE.Quaternion().fromArray(poseData.rotation);
                tracks.push(new THREE.QuaternionKeyframeTrack(
                    `${boneNode.name}.quaternion`,
                    [0],
                    rotation.toArray()
                ));
            }
    }
    return new THREE.AnimationClip('VRMPoseClip', duration, tracks);
}

/**
 * A map from Mixamo rig name to VRM Humanoid bone name.
 * This map includes both old (without colon) and new (with colon) Mixamo naming conventions.
 */
const mixamoVRMRigMap: { [mixamoRigName: string]: VRMHumanBoneName } = {
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
	mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
	mixamorigLeftHandThumb2: 'leftThumbProximal',
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
	mixamorigRightHandPinky1: 'rightLittleProximal',
	mixamorigRightHandPinky2: 'rightLittleIntermediate',
	mixamorigRightHandPinky3: 'rightLittleDistal',
	mixamorigRightHandRing1: 'rightRingProximal',
	mixamorigRightHandRing2: 'rightRingIntermediate',
	mixamorigRightHandRing3: 'rightRingDistal',
	mixamorigRightHandMiddle1: 'rightMiddleProximal',
	mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
	mixamorigRightHandMiddle3: 'rightMiddleDistal',
	mixamorigRightHandIndex1: 'rightIndexProximal',
	mixamorigRightHandIndex2: 'rightIndexIntermediate',
	mixamorigRightHandIndex3: 'rightIndexDistal',
	mixamorigRightHandThumb1: 'rightThumbMetacarpal',
	mixamorigRightHandThumb2: 'rightThumbProximal',
	mixamorigRightHandThumb3: 'rightThumbDistal',
	mixamorigLeftUpLeg: 'leftUpperLeg',
	mixamorigLeftLeg: 'leftLowerLeg',
	mixamorigLeftFoot: 'leftFoot',
	mixamorigLeftToeBase: 'leftToes',
	mixamorigRightUpLeg: 'rightUpperLeg',
	mixamorigRightLeg: 'rightLowerLeg',
	mixamorigRightFoot: 'rightFoot',
	mixamorigRightToeBase: 'rightToes',
};

/**
 * Converts a Mixamo animation clip to be compatible with a VRM model.
 * This function retargets bone rotations and scales hips position.
 * @param asset The loaded FBX asset (THREE.Group) from Mixamo.
 * @param vrm The target VRM model.
 * @returns A new AnimationClip retargeted for the VRM model, or null if conversion fails.
 */
function convertMixamoAnimation(asset: THREE.Group, vrm: VRM): THREE.AnimationClip | null {
    // Find the animation clip. Use 'mixamo.com' by default, but fall back to the first clip.
    let clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com');
    if (!clip) {
        clip = asset.animations[0];
        if (!clip) {
            console.error("No animation clips found in the FBX asset.");
            return null;
        }
        console.warn("Could not find 'mixamo.com' animation clip. Using the first clip found:", clip.name);
    }

    const tracks: THREE.KeyframeTrack[] = [];

    const restRotationInverse = new THREE.Quaternion();
    const parentRestWorldRotation = new THREE.Quaternion();
    const _quatA = new THREE.Quaternion();

    // Adjust with reference to hips height.
    const motionHipsNode = asset.getObjectByName('mixamorigHips');
    if (!motionHipsNode) {
        console.error("Could not find 'mixamorigHips' in the FBX asset. Position may be incorrect.");
        return null;
    }
    const motionHipsHeight = motionHipsNode.position.y;
    const vrmHipsHeight = vrm.humanoid.normalizedRestPose.hips.position[1];
    const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

    clip.tracks.forEach((track) => {
        const trackSplitted = track.name.split('.');
        const mixamoRigName = trackSplitted[0];
        const propertyName = trackSplitted[1];

        const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
        if (!vrmBoneName) return;

        const vrmNode = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
        if (!vrmNode) return;
        const vrmNodeName = vrmNode.name;

        const mixamoRigNode = asset.getObjectByName(mixamoRigName);
        if (!mixamoRigNode) {
            console.warn(`Could not find Mixamo rig node: ${mixamoRigName}`);
            return;
        }

        if (track instanceof THREE.QuaternionKeyframeTrack) {
            mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
            mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

            const newValues = new Float32Array(track.values.length);
            for (let i = 0; i < track.values.length; i += 4) {
                _quatA.fromArray(track.values, i);
                _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
                _quatA.toArray(newValues, i);
            }
            
            const finalValues = Array.from(newValues).map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v));

            tracks.push(new THREE.QuaternionKeyframeTrack(
                `${vrmNodeName}.${propertyName}`,
                track.times,
                finalValues
            ));

        } else if (track instanceof THREE.VectorKeyframeTrack) {
            if (vrmBoneName === 'hips') {
                const newValues = track.values.map((v, i) => 
                    (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -v : v) * hipsPositionScale
                );
                tracks.push(new THREE.VectorKeyframeTrack(
                    `${vrmNodeName}.${propertyName}`,
                    track.times,
                    newValues
                ));
            }
        }
    });

    return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
}

export class VRMManager {
    public currentVrm: VRM | null = null;
    public hitboxes: THREE.Mesh[] = [];
    private scene: THREE.Scene;
    private loader: GLTFLoader;
    private fbxLoader: FBXLoader;
    private mixer: THREE.AnimationMixer | null = null;
    private currentAction: THREE.AnimationAction | null = null;
    private _lookAtMode: 'none' | 'camera' | 'mouse' | 'fixed' = 'none';
    private _fixedLookAtTarget: THREE.Object3D | THREE.Vector3 | null = null;
    public activeCamera: THREE.Camera;
    private _plane: THREE.Mesh;
    public eventBus: TypedEventBus<AppEvents>;

    constructor(scene: THREE.Scene, camera: THREE.Camera, plane: THREE.Mesh, eventBusInstance: TypedEventBus<AppEvents>) {
        this.activeCamera = camera;
        this.scene = scene;
        this._plane = plane;
        this.eventBus = eventBusInstance;

        this.loader = new GLTFLoader();
        this.loader.register((parser) => new VRMLoaderPlugin(parser));
        this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

        this.fbxLoader = new FBXLoader();
    }

    public async loadVRM(filePathOrUrl: string): Promise<void> {
        if (this.currentVrm) {
            this.eventBus.emit('vrm:unloaded');
            this.scene.remove(this.currentVrm.scene);
            this.currentVrm = null;
        }
        this.removeHitboxes();

        const fileContent = await this._readFile(filePathOrUrl);
        if (!fileContent) return;

        try {
            const gltf = await new Promise<GLTF>((resolve, reject) => {
                this.loader.parse(fileContent, '', resolve, reject);
            });

            const vrm = gltf.userData.vrm as VRM;
            vrm.scene.position.set(0, -10.0, 0);
            vrm.scene.rotation.y = Math.PI;
            this.scene.add(vrm.scene);
            this.currentVrm = vrm;

            this.mixer = new THREE.AnimationMixer(vrm.scene);

            vrm.scene.traverse((object) => {
                if ((object as THREE.Mesh).isMesh) {
                    object.castShadow = true;
                    object.frustumCulled = false;
                }
            });

            this.createHitboxes(vrm);
            await new Promise(resolve => setTimeout(resolve, 500));

            // Play the model loading animation sequence
            this.loadAndPlayAnimation('VRMA_02.vrma', false);
            await this.animateVrmDrop(vrm, 0.5, 3.0, 0.0);

            setTimeout(() => {
                this.loadAndPlayAnimation('VRMA_03.vrma', false);
            }, 3000);

            const expressionNames = Object.keys(this.currentVrm.expressionManager.expressionMap);
            this.eventBus.emit('vrm:loaded', { vrm: this.currentVrm, expressionNames });

        } catch (error) {
            console.error('VRM load failed:', error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Failed to load VRM model: ${message}`);
        }
    }

    private removeHitboxes() {
        this.hitboxes.forEach(hitbox => {
            hitbox.parent?.remove(hitbox);
            hitbox.geometry.dispose();
            if (Array.isArray(hitbox.material)) {
                hitbox.material.forEach(m => m.dispose());
            } else {
                hitbox.material.dispose();
            }
        });
        this.hitboxes = [];
    }

    private createHitboxes(vrm: VRM) {
        this.removeHitboxes();
        const hitboxMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.2,
            visible: false
        });
        const bonesToTarget: { [key in VRMHumanBoneName]?: { size: THREE.Vector3, position?: THREE.Vector3 } } = {
            [VRMHumanBoneName.Head]: { size: new THREE.Vector3(0.25, 0.3, 0.25), position: new THREE.Vector3(0, 0.1, 0)  },
            [VRMHumanBoneName.Spine]: { size: new THREE.Vector3(0.2, 0.2, 0.2), position: new THREE.Vector3(0, 0.1, 0)  },
            [VRMHumanBoneName.Hips]: { size: new THREE.Vector3(0.25, 0.25, 0.25)},
            [VRMHumanBoneName.LeftUpperArm]: { size: new THREE.Vector3(0.25, 0.1, 0.1), position: new THREE.Vector3(-0.1, 0, 0)},
            [VRMHumanBoneName.RightUpperArm]: { size: new THREE.Vector3(0.25, 0.1, 0.1), position: new THREE.Vector3(0.1, 0, 0)},
            [VRMHumanBoneName.LeftLowerArm]: { size: new THREE.Vector3(0.2, 0.15, 0.15), position: new THREE.Vector3(-0.13, 0, 0)},
            [VRMHumanBoneName.RightLowerArm]: { size: new THREE.Vector3(0.2, 0.15, 0.15), position: new THREE.Vector3(0.13, 0, 0)},
            [VRMHumanBoneName.LeftUpperLeg]: { size: new THREE.Vector3(0.2, 0.3, 0.2), position: new THREE.Vector3(0, -0.2, 0) },
            [VRMHumanBoneName.RightUpperLeg]: { size: new THREE.Vector3(0.2, 0.3, 0.2), position: new THREE.Vector3(0, -0.2, 0) },
            [VRMHumanBoneName.LeftLowerLeg]: { size: new THREE.Vector3(0.15, 0.4, 0.15), position: new THREE.Vector3(0, -0.2, 0) },
            [VRMHumanBoneName.RightLowerLeg]: { size: new THREE.Vector3(0.15, 0.4, 0.15), position: new THREE.Vector3(0, -0.2, 0) },
        };
        for (const [boneName, config] of Object.entries(bonesToTarget)) {
            const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
            if (boneNode) {
                const hitboxGeo = new THREE.BoxGeometry(config.size.x, config.size.y, config.size.z);
                const hitbox = new THREE.Mesh(hitboxGeo, hitboxMaterial);
                hitbox.name = `hitbox_${boneName}`;
                if (config.position) {
                    hitbox.position.copy(config.position);
                }
                boneNode.add(hitbox);
                this.hitboxes.push(hitbox);
            }
        }
    }

    private async _readFile(filePath: string): Promise<ArrayBuffer | null> {
        try {
            // electronAPI.readFile을 사용하여 절대/상대 경로의 파일을 읽습니다.
            const fileContent = await window.electronAPI.readFile(filePath);
            if (!(fileContent instanceof ArrayBuffer)) {
                const error = fileContent as any;
                if (error && error.error) {
                     throw new Error(error.error);
                }
                throw new Error('Invalid file content received.');
            }
            return fileContent;
        } catch (error) {
            console.error(`Failed to read file ${filePath}:`, error);
            alert(`파일을 읽는 데 실패했습니다: ${filePath}`);
            return null;
        }
    }

    /**
     * Resolves a resource path by checking userdata first, then falling back to assets.
     * @param resourceType - The type of resource, which determines the subfolder.
     * @param fileName - The name of the file to resolve.
     * @returns The full absolute path if found, otherwise null.
     */
    private async _resolveResourcePath(resourceType: 'animation' | 'pose' | 'vrm', fileName: string): Promise<string | null> {
        const subfolders = {
            animation: { user: 'animations', asset: 'Animation' },
            pose: { user: 'poses', asset: 'Pose' },
            vrm: { user: 'vrm', asset: 'VRM' },
        };
        const { user, asset } = subfolders[resourceType];

        // 1. Check userdata
        const userPath = await window.electronAPI.resolvePath('userData', `${user}/${fileName}`);
        if (await window.electronAPI.fileExists(userPath)) {
            return userPath;
        }

        // 2. Fallback to assets
        const assetPath = await window.electronAPI.resolvePath('assets', `${asset}/${fileName}`);
        if (await window.electronAPI.fileExists(assetPath)) {
            return assetPath;
        }
        
        console.error(`Resource '${fileName}' not found in 'userdata/${user}' or 'assets/${asset}'.`);
        return null;
    }

    /**
     * Loads and parses a file from an absolute path.
     * @param absolutePath - The full, absolute path to the file.
     * @returns A ParsedFile object or null if parsing fails.
     */
    private async loadAndParseFile(absolutePath: string): Promise<ParsedFile> {
        if (!this.currentVrm) {
            console.error('[VRMManager] Cannot parse file because no VRM is loaded.');
            return null;
        }

        const fileContent = await this._readFile(absolutePath);
        if (!fileContent) return null;
        
        let clip: THREE.AnimationClip | null = null;
        try {
            const jsonString = new TextDecoder().decode(fileContent);
            const jsonParsed = JSON.parse(jsonString);
            if (jsonParsed.hips && this.currentVrm) {
                clip = createAnimationClipFromVRMPose(jsonParsed as VRMPose, this.currentVrm);
            }
        } catch (e) { /* Not a JSON, proceed */ }

        if (!clip) {
            try {
                if (absolutePath.endsWith('.vrma')) {
                    const gltf = await this.loader.parseAsync(fileContent, '');
                    const vrmAnim = gltf.userData.vrmAnimations?.[0];
                    if (vrmAnim) clip = createVRMAnimationClip(vrmAnim, this.currentVrm!);
                } else if (absolutePath.endsWith('.fbx')) {
                    const fbxAsset = this.fbxLoader.parse(fileContent, '');
                    if (fbxAsset) {
                        // Convert the Mixamo FBX animation to a VRM-compatible animation clip
                        clip = convertMixamoAnimation(fbxAsset, this.currentVrm!);
                    }
                }
            } catch (error) {
                console.error(`[VRMManager] Failed to parse binary file ${absolutePath}:`, error);
            }
        }

        if (clip) {
            return { type: clip.duration < 0.1 ? 'pose' : 'animation', data: clip };
        }
        return null;
    }

    public async loadAndPlayAnimation(fileName: string, loop = false, crossFadeDuration = 0.5) {
        const absolutePath = await this._resolveResourcePath('animation', fileName);
        if (!absolutePath) return;
        
        const clip = await this.loadAndParseFile(absolutePath);
        if (clip?.type === 'animation') {
            this.playAnimation(clip.data, loop, crossFadeDuration);
        } else if (clip?.type === 'pose') {
            console.warn(`Attempted to play a pose file as an animation: ${fileName}`);
        }
   }

    public async loadAndApplyPose(fileName: string) {
        const absolutePath = await this._resolveResourcePath('pose', fileName);
        if (!absolutePath) return;

        const clip = await this.loadAndParseFile(absolutePath);
        if (clip?.type === 'pose') {
            this.applyPose(clip.data);
        } else if (clip?.type === 'animation') {
            console.warn(`Attempted to apply an animation file as a pose: ${fileName}`);
        }
    }

    /**
     * Loads a pose from a given absolute file path and applies it to the VRM.
     * @param absolutePath The full, absolute path to the pose file.
     */
    public async applyPoseFromFile(absolutePath: string) {
        if (!absolutePath) return;
        const clip = await this.loadAndParseFile(absolutePath);
        if (clip?.type === 'pose') {
            this.applyPose(clip.data);
        } else {
            alert('선택한 파일은 유효한 포즈 파일이 아닙니다.');
            console.warn(`Attempted to apply a non-pose file: ${absolutePath}`);
        }
    }

    public applyPose(poseClip: THREE.AnimationClip): void {
        if (!this.currentVrm || !this.mixer) return;
        this.mixer.stopAllAction();
        this.currentAction = null;
        const newAction = this.mixer.clipAction(poseClip);
        newAction.setLoop(THREE.LoopOnce, 0);
        newAction.clampWhenFinished = true;
        newAction.play();
        this.currentVrm.scene.updateMatrixWorld(true);
        eventBus.emit('vrm:poseApplied');
    }

    public playAnimation(clip: THREE.AnimationClip, loop = false, crossFadeDuration = 0.5): void {
        if (!this.currentVrm || !this.mixer) return;

        // Stop all previous actions to ensure the new animation plays with full influence.
        this.mixer.stopAllAction();

        const newAction = this.mixer.clipAction(clip);
        newAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 0);
        if (!loop) {
            newAction.clampWhenFinished = true;
        }
        
        newAction.play();
        this.currentAction = newAction;
    }

    public resetToTPose(): void {
        if (!this.currentVrm || !this.mixer) return;
        this.mixer.stopAllAction();
        this.currentAction = null;
        this.currentVrm.humanoid.resetNormalizedPose();
        this.eventBus.emit('vrm:poseApplied'); // Notify UI that the pose has changed
    }

    private animateVrmDrop(vrm: VRM, duration: number, startY: number, endY: number): Promise<void> {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const step = () => {
                const elapsedTime = (performance.now() - startTime) / 1000;
                const progress = Math.min(elapsedTime / duration, 1);
                vrm.scene.position.y = startY + (endY - startY) * progress;
                if (progress < 1) requestAnimationFrame(step);
                else resolve();
            };
            requestAnimationFrame(step);
        });
    }

    public animateExpression(expressionName: string, targetWeight: number, duration: number): void {
        if (!this.currentVrm?.expressionManager) return;
        const expressionManager = this.currentVrm.expressionManager;
        if (!expressionManager.expressionMap[expressionName]) return;
        const startWeight = expressionManager.getValue(expressionName) || 0.0;
        const startTime = performance.now();
        const step = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / (duration * 1000), 1);
            const currentWeight = startWeight + (targetWeight - startWeight) * progress;
            expressionManager.setValue(expressionName, currentWeight);

            for (const name in expressionManager.expressionMap) {
                if (name !== expressionName) {
                    expressionManager.setValue(name, 0.0);
                }
            }
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    public animateExpressionAdditive(expressionName: string, targetWeight: number, duration: number): void {
        if (!this.currentVrm?.expressionManager) return;
        const expressionManager = this.currentVrm.expressionManager;
        if (!expressionManager.expressionMap[expressionName]) return;
        const startWeight = expressionManager.getValue(expressionName) || 0.0;
        const startTime = performance.now();
        const step = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / (duration * 1000), 1);
            const currentWeight = startWeight + (targetWeight - startWeight) * progress;
            expressionManager.setValue(expressionName, currentWeight);
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    public update(delta: number): void {
        this.mixer?.update(delta); // VRM.update()가 내부적으로 mixer를 업데이트하므로 중복 호출을 피합니다.
        if (this.currentVrm) {
            // VRM.update()는 애니메이션, 물리(Spring Bone) 등 모든 것을 업데이트합니다.
            this.currentVrm.update(delta);
            
            let lookAtTarget: THREE.Object3D | THREE.Vector3 | null = null;
            if (this._lookAtMode === 'camera') {
                lookAtTarget = this.activeCamera;
            } else if (this._lookAtMode === 'mouse') {
                if (window.mousePosition) {
                    const mouse = new THREE.Vector2(window.mousePosition.x, window.mousePosition.y);
                    const raycaster = new THREE.Raycaster();
                    raycaster.setFromCamera(mouse, this.activeCamera);

                    // 두 카메라 타입 모두에서, 캐릭터 앞의 가상 평면과 교차점을 찾습니다.
                    const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(this.activeCamera.quaternion);
                    const planeDistance = this.currentVrm.scene.position.distanceTo(this.activeCamera.position) * 0.8;
                    const planePoint = this.activeCamera.position.clone().add(this.activeCamera.getWorldDirection(new THREE.Vector3()).multiplyScalar(planeDistance));
                    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
                    
                    const intersection = new THREE.Vector3();
                    if (raycaster.ray.intersectPlane(plane, intersection)) {
                        lookAtTarget = intersection;
                    }
                }
            } else if (this._lookAtMode === 'fixed') {
                lookAtTarget = this._fixedLookAtTarget;
            }
            
            if (lookAtTarget) {
                const head = this.currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
                if (head) {
                    const targetPos = new THREE.Vector3();
                    if (lookAtTarget instanceof THREE.Object3D) lookAtTarget.getWorldPosition(targetPos);
                    else targetPos.copy(lookAtTarget);
                    const headPos = new THREE.Vector3();
                    head.getWorldPosition(headPos);
                    const lookAtMatrix = new THREE.Matrix4().lookAt(headPos, targetPos, new THREE.Vector3(0, 1, 0));
                    const targetWorldQuat = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);
                    const parentWorldQuat = new THREE.Quaternion();
                    head.parent.getWorldQuaternion(parentWorldQuat);
                    const parentWorldQuatInverse = parentWorldQuat.clone().invert();
                    const targetLocalQuat = targetWorldQuat.clone().premultiply(parentWorldQuatInverse);
                    const e = new THREE.Euler().setFromQuaternion(targetLocalQuat, 'YXZ');
                    const maxYaw = THREE.MathUtils.degToRad(30);
                    const maxPitch = THREE.MathUtils.degToRad(20);
                    e.y = THREE.MathUtils.clamp(e.y, -maxYaw, maxYaw);
                    e.x = THREE.MathUtils.clamp(e.x, -maxPitch, maxPitch);
                    const clampedTargetLocalQuat = new THREE.Quaternion().setFromEuler(e);
                    head.quaternion.slerp(clampedTargetLocalQuat, 0.03);
                }
            }
            if (this.currentVrm.lookAt) {
                if (lookAtTarget) {
                    let actualTarget: THREE.Object3D;
                    if (lookAtTarget instanceof THREE.Vector3) {
                        const dummyObject = new THREE.Object3D();
                        dummyObject.position.copy(lookAtTarget);
                        dummyObject.updateMatrixWorld(true);
                        actualTarget = dummyObject;
                    } else {
                        actualTarget = lookAtTarget;
                    }
                    this.currentVrm.lookAt.target = actualTarget;
                } else {
                    this.currentVrm.lookAt.target = undefined;
                }
            }
            if (this.currentVrm.lookAt) this.currentVrm.lookAt.update(delta);
            this.currentVrm.scene.traverse(object => {
                if ((object as THREE.SkinnedMesh).isSkinnedMesh) (object as THREE.SkinnedMesh).skeleton.update();
            });
        }
    }

    public lookAt(target: 'camera' | 'mouse' | THREE.Vector3 | null): void {
        if (target === 'camera') {
            this._lookAtMode = 'camera';
            this._fixedLookAtTarget = null;
        } else if (target === 'mouse') {
            this._lookAtMode = 'mouse';
            this._fixedLookAtTarget = null;
        } else if (target instanceof THREE.Vector3) {
            this._lookAtMode = 'fixed';
            this._fixedLookAtTarget = target;
        } else { // target is null
            this._lookAtMode = 'none';
            this._fixedLookAtTarget = null;
        }
    }

    public setHitboxesVisible(visible: boolean): void {
        this.hitboxes.forEach(hitbox => {
            const material = hitbox.material as THREE.MeshBasicMaterial;
            material.visible = visible;
        });
    }

    public async saveCurrentPose() {
        if (!this.currentVrm) {
            alert('VRM 모델이 로드되지 않았습니다.');
            return;
        }

        const originalPose = this.currentVrm.humanoid.getNormalizedPose();
        const cleanedPose: VRMPose = {};

        for (const boneName in originalPose) {
            const humanBoneName = boneName as VRMHumanBoneName;
            const bonePose = originalPose[humanBoneName];
            if (!bonePose || !bonePose.rotation) continue;

            // Only copy rotation for all bones, ignore position entirely.
            cleanedPose[humanBoneName] = {
                rotation: bonePose.rotation,
            };
        }

        const jsonString = JSON.stringify(cleanedPose, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (event.target?.result instanceof ArrayBuffer) {
                const result = await window.electronAPI.saveVrmaPose(event.target.result);
                if (result.success) console.log(`Pose saved: ${result.message}`);
                else if (result.message !== 'Save operation canceled.') console.error(`Failed to save pose: ${result.message}`);
            } else {
                console.error('Failed to read blob as ArrayBuffer.');
                alert('포즈 파일 변환에 실패했습니다.');
            }
        };
        reader.onerror = (error) => console.error('FileReader error:', error);
        reader.readAsArrayBuffer(blob);
    }
}

