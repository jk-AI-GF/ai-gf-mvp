
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRM, VRMPose } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { createJointSliders, createExpressionSliders, updateExpressionSliderValue, createMeshList } from './ui-manager';

export class VRMManager {
    public currentVrm: VRM | null = null;
    private scene: THREE.Scene;
    private loader: GLTFLoader;
    private fbxLoader: FBXLoader;
    private mixer: THREE.AnimationMixer | null = null;
    private currentAction: THREE.AnimationAction | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        this.loader = new GLTFLoader();
        this.loader.register((parser) => new VRMLoaderPlugin(parser));
        this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

        this.fbxLoader = new FBXLoader();

        // Bind `this` to window functions that will be called from UI or other modules
        window.loadAnimationFile = this.loadAnimationFile.bind(this);
        window.animateExpression = this.animateExpression.bind(this);
        window.animateExpressionAdditive = this.animateExpressionAdditive.bind(this);
    }

    public async loadVRM(filePathOrUrl: string): Promise<void> {
        if (this.currentVrm) {
            this.scene.remove(this.currentVrm.scene);
            this.currentVrm = null;
        }

        const isAbsolute = filePathOrUrl.startsWith('file://');
        const promise = isAbsolute
            ? window.electronAPI.readAbsoluteFile(filePathOrUrl.substring(7))
            : window.electronAPI.readAssetFile(filePathOrUrl);

        try {
            const fileContent = await promise;
            if (!(fileContent instanceof ArrayBuffer)) {
                if (typeof fileContent === 'object' && 'error' in fileContent) {
                    throw new Error(fileContent.error);
                }
                throw new Error('Invalid file content received.');
            }

            const gltf = await new Promise<GLTF>((resolve, reject) => {
                this.loader.parse(fileContent, '', resolve, reject);
            });

            const vrm = gltf.userData.vrm as VRM;
            vrm.scene.position.set(0, 3.0, 0);
            vrm.scene.rotation.y = Math.PI;
            this.scene.add(vrm.scene);
            this.currentVrm = vrm;
            window.currentVrm = vrm; // For legacy compatibility if needed

            this.mixer = new THREE.AnimationMixer(vrm.scene);

            vrm.scene.traverse((object) => {
                if ((object as THREE.Mesh).isMesh) {
                    object.castShadow = true;
                    object.frustumCulled = false;
                }
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            this.loadAnimationFile('Animation/VRMA_02.vrma');
            await this.animateVrmDrop(vrm, 0.5, 3.0, -0.6);

            setTimeout(() => {
                this.loadAnimationFile('Animation/VRMA_03.vrma');
            }, 3000);

            window.expressionMap = vrm.expressionManager.expressionMap;
            if (vrm.expressionManager) {
                window.vrmExpressionList = Object.keys(vrm.expressionManager.expressionMap);
                createExpressionSliders();
            }
            
            // Update UI that depends on the new VRM
            createMeshList(this.currentVrm, window.toggleVrmMeshVisibility);

        } catch (error) {
            console.error('VRM load failed:', error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Failed to load VRM model: ${message}`);
        }
    }

    private animateVrmDrop(vrm: VRM, duration: number, startY: number, endY: number): Promise<void> {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const step = () => {
                const elapsedTime = (performance.now() - startTime) / 1000;
                const progress = Math.min(elapsedTime / duration, 1);
                vrm.scene.position.y = startY + (endY - startY) * progress;
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }

    public async loadAnimationFile(filePathOrUrl: string, options: { loop?: boolean; crossFadeDuration?: number } = {}): Promise<void> {
        if (!this.currentVrm || !this.mixer) return;

        const { loop = false, crossFadeDuration = 0.5 } = options;

        const isAbsolute = filePathOrUrl.startsWith('file://');
        const promise = isAbsolute
            ? window.electronAPI.readAbsoluteFile(filePathOrUrl.substring(7))
            : window.electronAPI.readAssetFile(filePathOrUrl);

        let newClip: THREE.AnimationClip | null = null;

        try {
            const fileContent = await promise;
            if (!(fileContent instanceof ArrayBuffer)) {
                throw new Error('Invalid file content received.');
            }

            if (filePathOrUrl.endsWith('.vrma')) {
                try {
                    const poseData = JSON.parse(new TextDecoder().decode(fileContent)) as VRMPose;
                    if (poseData.hips) {
                        if (this.currentAction) {
                            this.currentAction.stop();
                            this.currentAction = null;
                        }
                        this.mixer.stopAllAction();
                        this.currentVrm.humanoid.setNormalizedPose(poseData);
                        this.currentVrm.scene.updateMatrixWorld(true);
                        createJointSliders();
                        console.log(`Loaded VRMA as JSON pose from ${filePathOrUrl}`);
                        return;
                    }
                } catch (e) {
                    // Not a pose, continue to load as animation
                }

                const gltf = await new Promise<GLTF>((resolve, reject) => {
                    this.loader.parse(fileContent, '', resolve, reject);
                });
                if (gltf.userData.vrmAnimations && gltf.userData.vrmAnimations[0]) {
                    newClip = createVRMAnimationClip(gltf.userData.vrmAnimations[0], this.currentVrm);
                }
            } else if (filePathOrUrl.endsWith('.fbx')) {
                const fbx = this.fbxLoader.parse(fileContent, '');
                if (fbx.animations && fbx.animations.length > 0) {
                    newClip = fbx.animations[0];
                }
            }

            if (!newClip) {
                console.warn(`No animation clip could be loaded from ${filePathOrUrl}`);
                return;
            }

            const newAction = this.mixer.clipAction(newClip);
            newAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 0);
            if (!loop) newAction.clampWhenFinished = true;

            if (this.currentAction && this.currentAction !== newAction) {
                this.currentAction.crossFadeTo(newAction, crossFadeDuration, true);
            }
            newAction.play();
            this.currentAction = newAction;
            console.log(`Loaded animation from ${filePathOrUrl}.`);

        } catch (error) {
            console.error(`Error loading animation file from ${filePathOrUrl}:`, error);
            alert(`Failed to load animation file: ${(error as Error).message}`);
        }
    }

    public animateExpression(expressionName: string, targetWeight: number, duration: number): void {
        if (!this.currentVrm?.expressionManager) return;
        const expressionManager = this.currentVrm.expressionManager;
        if (!expressionManager.expressionMap[expressionName]) {
            console.error(`Expression "${expressionName}" not found.`);
            return;
        }

        const startWeight = expressionManager.getValue(expressionName) || 0.0;
        const startTime = performance.now();

        const step = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / (duration * 1000), 1);
            const currentWeight = startWeight + (targetWeight - startWeight) * progress;

            expressionManager.setValue(expressionName, currentWeight);
            updateExpressionSliderValue(expressionName, currentWeight);

            for (const name in expressionManager.expressionMap) {
                if (name !== expressionName) {
                    expressionManager.setValue(name, 0.0);
                    updateExpressionSliderValue(name, 0.0);
                }
            }

            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    public animateExpressionAdditive(expressionName: string, targetWeight: number, duration: number): void {
        if (!this.currentVrm?.expressionManager) return;
        const expressionManager = this.currentVrm.expressionManager;
        if (!expressionManager.expressionMap[expressionName]) {
            console.error(`Additive Expression "${expressionName}" not found.`);
            return;
        }

        const startWeight = expressionManager.getValue(expressionName) || 0.0;
        const startTime = performance.now();

        const step = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / (duration * 1000), 1);
            const currentWeight = startWeight + (targetWeight - startWeight) * progress;

            expressionManager.setValue(expressionName, currentWeight);
            updateExpressionSliderValue(expressionName, currentWeight);

            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    public update(delta: number): void {
        this.mixer?.update(delta);
        if (this.currentVrm) {
            this.currentVrm.update(delta);
            this.currentVrm.scene.traverse(object => {
                if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
                    (object as THREE.SkinnedMesh).skeleton.update();
                }
            });
        }
    }
}
