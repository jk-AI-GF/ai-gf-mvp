import React, { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Scene from './Scene';
import { VRMManager } from '../../vrm-manager';
import { PluginManager } from '../../../plugins/plugin-manager';
import eventBus from '../../../core/event-bus';
import { TriggerEngine } from '../../../core/trigger-engine';
import { initAudioContext, playTTS } from '../../audio-service';
import { AutoLookAtPlugin } from '../../../plugins/auto-look-at-plugin';
import { AutoBlinkPlugin } from '../../../plugins/auto-blink-plugin';
import { AutoIdleAnimationPlugin } from '../../../plugins/auto-idle-animation-plugin';
import { createPluginContext } from '../../../plugin-api/context-factory';
import { ProactiveDialoguePlugin } from '../../../plugins/proactive-dialogue-plugin';
import { ActionTestPlugin } from '../../../plugins/action-test-plugin';
import { MToonMaterialOutlineWidthMode } from '@pixiv/three-vrm';
import { GrabVrmPlugin } from '../../../plugins/grab-vrm-plugin';
import { TimeSyncTestPlugin } from '../../../plugins/time-sync-test-plugin';
import { LlmResponseHandlerPlugin } from '../../../plugins/LlmResponseHandlerPlugin'; // Import the new plugin
import { ChatService } from '../../chat-service';
import { CustomTriggerManager } from '../../../core/custom-trigger-manager';
import { SystemControls } from '../../../plugin-api/system-controls';
import { toggleTts, setMasterVolume } from '../../audio-service';

interface VRMCanvasProps {
  onLoad: (managers: { 
    vrmManager: VRMManager; 
    pluginManager: PluginManager; 
    chatService: ChatService;
    customTriggerManager: CustomTriggerManager;
  }) => void;
}

const VRMCanvas: React.FC<VRMCanvasProps> = ({ onLoad }) => {
  const handleSceneLoad = useCallback((instances: {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    plane: THREE.Mesh;
  }) => {
    const { scene, renderer, plane } = instances;

    // --- Camera and Controls Setup ---
    let cameraMode: 'orbit' | 'fixed' = 'fixed';
    const perspectiveCamera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    perspectiveCamera.position.set(1.4, 0.7, 2.5);
    
    const aspect = window.innerWidth / window.innerHeight;
    const frustumHeight = 3;
    const orthographicCamera = new THREE.OrthographicCamera(
        -frustumHeight * aspect / 2,
        frustumHeight * aspect / 2,
        frustumHeight / 2,
        -frustumHeight / 2,
        0.1,
        1000
    );
    orthographicCamera.position.set(0, 0.98, 1.0);
    orthographicCamera.zoom = 1.4; // Zoom을 조정하여 캐릭터 크기를 맞춥니다.
    orthographicCamera.updateProjectionMatrix();

    let activeCamera: THREE.Camera = orthographicCamera;

    const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
    controls.enabled = false; // Default to disabled as cameraMode is 'fixed'
    controls.target.set(0, 0.6, 0);
    controls.update();

    // --- VRM Manager ---
    const vrmManager = new VRMManager(scene, activeCamera, plane, eventBus);
    vrmManager.loadVRM('VRM/Liqu.vrm');

    // --- Edit Mode State ---
    let isEditMode = false;

    // --- Plugin System ---
    const triggerEngine = new TriggerEngine();
    
    // 1. Create a mutable SystemControls object
    const systemControls: SystemControls = {
      toggleTts: (enable: boolean) => toggleTts(enable),
      toggleMouseIgnore: () => window.electronAPI.toggleMouseIgnore(),
      setMasterVolume: (volume: number) => setMasterVolume(volume),
      // Placeholders for custom trigger functions
      registerCustomTrigger: (trigger: any) => {
        console.warn('registerCustomTrigger called before CustomTriggerManager was initialized.');
      },
      unregisterCustomTrigger: (triggerId: string) => {
        console.warn('unregisterCustomTrigger called before CustomTriggerManager was initialized.');
      },
    };

    // 2. Create PluginContext with the mutable SystemControls
    const pluginContext = createPluginContext(vrmManager, triggerEngine, renderer, systemControls);

    // 3. Create PluginManager
    const pluginManager = new PluginManager(pluginContext);
    pluginManager.register(new AutoLookAtPlugin());
    pluginManager.register(new AutoBlinkPlugin());
    pluginManager.register(new AutoIdleAnimationPlugin());
    pluginManager.register(new ProactiveDialoguePlugin());
    pluginManager.register(new ActionTestPlugin());
    pluginManager.register(new GrabVrmPlugin());
    pluginManager.register(new TimeSyncTestPlugin());
    pluginManager.register(new LlmResponseHandlerPlugin()); // Register the new plugin

    // 4. Create CustomTriggerManager
    const customTriggerManager = new CustomTriggerManager(pluginContext);
    customTriggerManager.loadAndRegisterAll(); // Load triggers from storage

    // 5. Now, wire up the actual implementations to SystemControls
    systemControls.registerCustomTrigger = customTriggerManager.registerTrigger.bind(customTriggerManager);
    systemControls.unregisterCustomTrigger = customTriggerManager.unregisterTrigger.bind(customTriggerManager);

    // --- Chat Service ---
    const chatService = new ChatService(vrmManager, pluginManager);

    // Pass managers up to the provider
    onLoad({ vrmManager, pluginManager, chatService, customTriggerManager });

    const setOutlineMode = (mode: typeof MToonMaterialOutlineWidthMode.WorldCoordinates | typeof MToonMaterialOutlineWidthMode.ScreenCoordinates) => {
        if (vrmManager.currentVrm) {
            vrmManager.currentVrm.scene.traverse((object) => {
                const mesh = object as THREE.Mesh;
                if (mesh.isMesh && mesh.material) {
                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    materials.forEach((material: any) => {
                        if (material.isMToonMaterial) {
                            material.outlineWidthMode = mode;
                        }
                    });
                }
            });
        }
    };

    // Set initial outline mode based on the default camera
    eventBus.on('vrm:loaded', () => {
        if (cameraMode === 'fixed') {
            setOutlineMode(MToonMaterialOutlineWidthMode.ScreenCoordinates);
        } else {
            setOutlineMode(MToonMaterialOutlineWidthMode.WorldCoordinates);
        }
    });

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    const tempVector = new THREE.Vector3();
    const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        vrmManager.update(delta);

        if (vrmManager.currentVrm) {
            // The plugin manager now internally handles the edit mode state
            pluginManager.update(delta, vrmManager.currentVrm);
            
            const head = vrmManager.currentVrm.humanoid.getNormalizedBoneNode('head');
            if (head) {
                // 강제로 월드 행렬을 업데이트하여 최신 위치를 보장합니다.
                head.updateWorldMatrix(true, false);
                const headPosition = head.getWorldPosition(tempVector);

                headPosition.project(activeCamera);
                const x = (headPosition.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
                const y = (-headPosition.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
                eventBus.emit('ui:updateFloatingMessagePosition', { left: x, top: y, visible: true });
            } else {
                eventBus.emit('ui:updateFloatingMessagePosition', { left: 0, top: 0, visible: false });
            }
        } else {
            eventBus.emit('ui:updateFloatingMessagePosition', { left: 0, top: 0, visible: false });
        }
        
        controls.update();
        renderer.render(scene, activeCamera);
    };
    animate();

    // --- Event Listeners & IPC ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.panel, .sidebar, .top-menu, .chat-container')) return;
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, activeCamera);
      const intersects = raycaster.intersectObjects(vrmManager.hitboxes);
      if (intersects.length > 0) {
        const partName = intersects[0].object.name.replace('hitbox_', '');
        if (event.button === 0) eventBus.emit('character_part_clicked', { partName });
        else if (event.button === 2) {
          event.preventDefault();
          eventBus.emit('character_part_right_clicked', { partName });
        }
      }
    };

    const handleResize = () => {
        const aspect = window.innerWidth / window.innerHeight;
        if (activeCamera instanceof THREE.PerspectiveCamera) {
            activeCamera.aspect = aspect;
            activeCamera.updateProjectionMatrix();
        } else if (activeCamera instanceof THREE.OrthographicCamera) {
            const frustumHeight = 3; // 기준 높이
            activeCamera.left = -frustumHeight * aspect / 2;
            activeCamera.right = frustumHeight * aspect / 2;
            activeCamera.top = frustumHeight / 2;
            activeCamera.bottom = -frustumHeight / 2;
            activeCamera.updateProjectionMatrix();
        }
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleSetCameraMode = (newMode: 'orbit' | 'fixed') => {
        if (cameraMode === newMode) return;

        if (newMode === 'fixed') {
            cameraMode = 'fixed';
            activeCamera = orthographicCamera;
            controls.enabled = false;
            eventBus.emit('camera:modeChanged', 'follow');
            setOutlineMode(MToonMaterialOutlineWidthMode.ScreenCoordinates);
        } else { // 'orbit'
            cameraMode = 'orbit';
            activeCamera = perspectiveCamera;
            perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
            perspectiveCamera.updateProjectionMatrix();
            controls.enabled = true;
            eventBus.emit('camera:modeChanged', 'free');
            setOutlineMode(MToonMaterialOutlineWidthMode.WorldCoordinates);
        }
    };

    const handleEditModeChange = (data: { isEditMode: boolean }) => {
        isEditMode = data.isEditMode;
        pluginManager.setEditMode(isEditMode);
        handleSetCameraMode(data.isEditMode ? 'orbit' : 'fixed');
    };

    const requestCameraState = () => {
        eventBus.emit('camera:modeChanged', cameraMode === 'orbit' ? 'free' : 'follow');
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleMouseClick);
    document.addEventListener('click', initAudioContext, { once: true });
    const unsubTts = window.electronAPI.on('tts-speak', (text: string) => playTTS(text));
    const unsubSetExpressionWeight = window.electronAPI.on('set-expression-weight', (expressionName: string, weight: number) => {
        if (vrmManager.currentVrm?.expressionManager) {
            vrmManager.currentVrm.expressionManager.setValue(expressionName, weight);
        }
    });
    eventBus.on('ui:editModeToggled', handleEditModeChange);
    eventBus.on('camera:requestState', requestCameraState);
    eventBus.on('camera:setMode', ({ mode }) => handleSetCameraMode(mode));

    // --- Cleanup ---
    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousedown', handleMouseClick);
        unsubTts();
        unsubSetExpressionWeight();
        eventBus.off('ui:editModeToggled', handleEditModeChange);
        eventBus.off('camera:requestState', requestCameraState);
        eventBus.off('camera:setMode', ({ mode }) => handleSetCameraMode(mode));
    };
  }, [onLoad]);

  return <Scene onLoad={handleSceneLoad} />;
};

export default VRMCanvas;
