import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRM, VRMHumanBoneName, VRMPose } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import { get3DPointFromMouse } from './scene-utils';
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
                if (boneName === VRMHumanBoneName.Hips) {
                    position.y = 0.7;
                }
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
    private _camera: THREE.PerspectiveCamera;
    private _plane: THREE.Mesh;
    public eventBus: TypedEventBus<AppEvents>;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, plane: THREE.Mesh, eventBusInstance: TypedEventBus<AppEvents>) {
        this._camera = camera;
        this.scene = scene;
        this._plane = plane;
        this.eventBus = eventBusInstance;

        this.loader = new GLTFLoader();
        this.loader.register((parser) => new VRMLoaderPlugin(parser));
        this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

        this.fbxLoader = new FBXLoader();

        window.animateExpression = this.animateExpression.bind(this);
        window.animateExpressionAdditive = this.animateExpressionAdditive.bind(this);
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
            vrm.scene.position.set(0, 3.0, 0);
            vrm.scene.rotation.y = Math.PI;
            this.scene.add(vrm.scene);
            this.currentVrm = vrm;
            window.currentVrm = vrm;

            this.mixer = new THREE.AnimationMixer(vrm.scene);

            vrm.scene.traverse((object) => {
                if ((object as THREE.Mesh).isMesh) {
                    object.castShadow = true;
                    object.frustumCulled = false;
                }
            });

            this.createHitboxes(vrm);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const customAnimationPath1 = 'Animation/VRMA_02.vrma';
            try {
                const animationResult1 = await this.loadAndParseFile(customAnimationPath1);
                if (animationResult1?.type === 'animation') {
                    this.playAnimation(animationResult1.data, false);
                }
            } catch (error) {
                console.error(`[VRMManager] Error playing custom animation ${customAnimationPath1}:`, error);
            }

            await this.animateVrmDrop(vrm, 0.5, 3.0, -0.6);

            setTimeout(async () => {
                const customAnimationPath2 = 'Animation/VRMA_03.vrma';
                try {
                    const animationResult2 = await this.loadAndParseFile(customAnimationPath2);
                    if (animationResult2?.type === 'animation') {
                        this.playAnimation(animationResult2.data, false);
                    }
                } catch (error) {
                    console.error(`[VRMManager] Error playing custom animation ${customAnimationPath2}:`, error);
                }
            }, 3000);

            this.eventBus.emit('vrm:loaded', { vrm: this.currentVrm });

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
        const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
        const bonesToTarget: { [key in VRMHumanBoneName]?: { size: THREE.Vector3, position?: THREE.Vector3 } } = {
            [VRMHumanBoneName.Head]: { size: new THREE.Vector3(0.3, 0.4, 0.3) },
            [VRMHumanBoneName.Spine]: { size: new THREE.Vector3(0.35, 0.5, 0.3) },
            [VRMHumanBoneName.Hips]: { size: new THREE.Vector3(0.35, 0.3, 0.3), position: new THREE.Vector3(0, 0.05, 0) },
            [VRMHumanBoneName.LeftUpperArm]: { size: new THREE.Vector3(0.15, 0.3, 0.15), position: new THREE.Vector3(0, -0.15, 0) },
            [VRMHumanBoneName.RightUpperArm]: { size: new THREE.Vector3(0.15, 0.3, 0.15), position: new THREE.Vector3(0, -0.15, 0) },
            [VRMHumanBoneName.LeftLowerArm]: { size: new THREE.Vector3(0.15, 0.3, 0.15), position: new THREE.Vector3(0, -0.15, 0) },
            [VRMHumanBoneName.RightLowerArm]: { size: new THREE.Vector3(0.15, 0.3, 0.15), position: new THREE.Vector3(0, -0.15, 0) },
            [VRMHumanBoneName.LeftUpperLeg]: { size: new THREE.Vector3(0.2, 0.4, 0.2), position: new THREE.Vector3(0, -0.2, 0) },
            [VRMHumanBoneName.RightUpperLeg]: { size: new THREE.Vector3(0.2, 0.4, 0.2), position: new THREE.Vector3(0, -0.2, 0) },
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
        // All file paths are now treated as relative to the assets directory.
        try {
            const fileContent = await window.electronAPI.readAssetFile(filePath);
            if (!(fileContent instanceof ArrayBuffer)) {
                // The main process might have returned an error object
                const error = fileContent as any;
                if (error && error.error) {
                     throw new Error(error.error);
                }
                throw new Error('Invalid file content received.');
            }
            return fileContent;
        } catch (error) {
            console.error(`Failed to read asset file ${filePath}:`, error);
            return null;
        }
    }

    public async loadAndParseFile(filePath: string): Promise<ParsedFile> {
        const fileContent = await this._readFile(filePath);
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
                if (filePath.endsWith('.vrma')) {
                    const gltf = await this.loader.parseAsync(fileContent, '');
                    const vrmAnim = gltf.userData.vrmAnimations?.[0];
                    if (vrmAnim) clip = createVRMAnimationClip(vrmAnim, this.currentVrm!);
                } else if (filePath.endsWith('.fbx')) {
                    const fbx = this.fbxLoader.parse(fileContent, '');
                    clip = fbx.animations[0] || null;
                }
            } catch (error) {
                console.error(`[VRMManager] Failed to parse binary file ${filePath}:`, error);
            }
        }

        if (clip) {
            return { type: clip.duration < 0.1 ? 'pose' : 'animation', data: clip };
        }
        return null;
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
        const newAction = this.mixer.clipAction(clip);
        newAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 0);
        if (!loop) newAction.clampWhenFinished = true;
        const canFade = this.currentAction && this.currentAction.getClip().duration > 0.1;
        if (canFade && this.currentAction !== newAction) {
            this.currentAction.crossFadeTo(newAction, crossFadeDuration, true);
        } else {
            this.currentAction?.stop();
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
        this.mixer?.update(delta);
        if (this.currentVrm) {
            this.currentVrm.update(delta);
            let lookAtTarget: THREE.Object3D | THREE.Vector3 | null = null;
            if (this._lookAtMode === 'camera') {
                lookAtTarget = this._camera;
            } else if (this._lookAtMode === 'mouse') {
                if (window.mousePosition) {
                    lookAtTarget = get3DPointFromMouse(this._camera, this._plane);
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

    public async saveCurrentPose() {
        if (!this.currentVrm) {
            alert('VRM 모델이 로드되지 않았습니다.');
            return;
        }
        const pose = this.currentVrm.humanoid.getNormalizedPose();
        const jsonString = JSON.stringify(pose, null, 2);
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

declare global {
    interface Window {
        vrmManager: VRMManager;
        currentVrm: VRM | null;
        vrmExpressionList: string[];
        expressionMap: { [name: string]: any };
        animateExpression: (expressionName: string, targetWeight: number, duration: number) => void;
        animateExpressionAdditive: (expressionName: string, targetWeight: number, duration: number) => void;
    }
}