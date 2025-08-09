import React, { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Scene from './Scene';
import { VRMManager } from '../../vrm-manager';
import { PluginManager } from '../../../plugins/plugin-manager';
import eventBus from '../../../core/event-bus';
import { TriggerEngine } from '../../../core/trigger-engine';
import { initAudioContext, playTTS, toggleTts, setMasterVolume } from '../../audio-service';
import { AutoLookAtPlugin } from '../../../plugins/auto-look-at-plugin';
import { AutoBlinkPlugin } from '../../../plugins/auto-blink-plugin';
import { AutoIdleAnimationPlugin } from '../../../plugins/auto-idle-animation-plugin';
import { createPluginContext } from '../../../plugin-api/context-factory';
import { ProactiveDialoguePlugin } from '../../../plugins/proactive-dialogue-plugin';
import { ActionTestPlugin } from '../../../plugins/action-test-plugin';
import { MToonMaterialOutlineWidthMode } from '@pixiv/three-vrm';
import { GrabVrmPlugin } from '../../../plugins/grab-vrm-plugin';
import { TimeSyncTestPlugin } from '../../../plugins/time-sync-test-plugin';
import { LlmResponseHandlerPlugin } from '../../../plugins/LlmResponseHandlerPlugin';
import { InteractionTrackerPlugin } from '../../../plugins/interaction-tracker-plugin';
import { CustomTriggerManager } from '../../../core/custom-trigger-manager';
import { SystemControls } from '../../../plugin-api/system-controls';
import { registerCoreActions } from '../../../core/action-registrar';
import { ActionRegistry } from '../../../core/action-registry';
import { characterState } from '../../../core/character-state';

interface VRMCanvasProps {
  onLoad: (managers: { 
    vrmManager: VRMManager; 
    pluginManager: PluginManager; 
    customTriggerManager: CustomTriggerManager;
    actionRegistry: ActionRegistry;
    renderer: THREE.WebGLRenderer;
  }) => void;
}

const VRMCanvas: React.FC<VRMCanvasProps> = ({ onLoad }) => {
  const handleSceneLoad = useCallback((instances: {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    plane: THREE.Mesh;
  }) => {
    const { scene, renderer, plane } = instances;

    // --- Initialize Character State & Persistence ---
    characterState.initialize(eventBus);

    const unsubLoad = window.electronAPI.onLoadCharacterState((savedState: any) => {
      console.log('[Renderer] Received initial character state from main:', savedState);
      characterState.hydrate(savedState);
      unsubLoad(); 
    });

    eventBus.on('character-state:changed', (newState) => {
      window.electronAPI.sendCharacterStateChanged(newState);
    });

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
    orthographicCamera.zoom = 1.4;
    orthographicCamera.updateProjectionMatrix();

    let activeCamera: THREE.Camera = orthographicCamera;

    const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
    controls.enabled = false;
    controls.target.set(0, 0.6, 0);
    controls.update();

    // --- VRM Manager ---
    const vrmManager = new VRMManager(scene, activeCamera, plane, eventBus);
    vrmManager.loadVRM('VRM/Liqu.vrm');

    // --- Plugin System ---
    const triggerEngine = new TriggerEngine();
    const actionRegistry = new ActionRegistry();

    // 1. Register all core actions BEFORE creating the context
    registerCoreActions(actionRegistry, vrmManager, renderer);

    const systemControls: SystemControls = {
      toggleTts: (enable: boolean) => toggleTts(enable),
      toggleMouseIgnore: () => window.electronAPI.toggleMouseIgnore(),
      setMasterVolume: (volume: number) => setMasterVolume(volume),
      registerCustomTrigger: (trigger: any) => {},
      unregisterCustomTrigger: (triggerId: string) => {},
    };

    // 2. Create context - it will now be populated with actions
    const pluginContext = createPluginContext(vrmManager, triggerEngine, systemControls, actionRegistry);

    // 3. Create and setup managers
    const pluginManager = new PluginManager(pluginContext);
    pluginManager.register(new AutoLookAtPlugin());
    pluginManager.register(new AutoBlinkPlugin());
    pluginManager.register(new AutoIdleAnimationPlugin());
    pluginManager.register(new ProactiveDialoguePlugin());
    pluginManager.register(new ActionTestPlugin());
    pluginManager.register(new GrabVrmPlugin());
    pluginManager.register(new TimeSyncTestPlugin());
    pluginManager.register(new LlmResponseHandlerPlugin());
    pluginManager.register(new InteractionTrackerPlugin());

    const customTriggerManager = new CustomTriggerManager(pluginContext);
    customTriggerManager.loadAndRegisterAll();

    systemControls.registerCustomTrigger = customTriggerManager.registerTrigger.bind(customTriggerManager);
    systemControls.unregisterCustomTrigger = customTriggerManager.unregisterTrigger.bind(customTriggerManager);

    // 4. Pass all managers and the registry up to the App component
    onLoad({ vrmManager, pluginManager, customTriggerManager, actionRegistry, renderer });

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
        triggerEngine.evaluateTriggers();

        if (vrmManager.currentVrm) {
            pluginManager.update(delta, vrmManager.currentVrm);
            
            const head = vrmManager.currentVrm.humanoid.getNormalizedBoneNode('head');
            if (head) {
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
            const frustumHeight = 3;
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
        } else {
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
        pluginManager.setEditMode(data.isEditMode);
        handleSetCameraMode(data.isEditMode ? 'orbit' : 'fixed');
    };

    const requestCameraState = () => {
        eventBus.emit('camera:modeChanged', cameraMode === 'orbit' ? 'free' : 'follow');
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleMouseClick);
    document.addEventListener('click', initAudioContext, { once: true });
    const unsubTts = window.electronAPI.on('tts-speak', (text: string) => playTTS(text));
    
    eventBus.on('camera:requestState', requestCameraState);
    eventBus.on('camera:setMode', ({ mode }) => handleSetCameraMode(mode));
    eventBus.on('ui:editModeToggled', handleEditModeChange);

    // --- Cleanup ---
    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousedown', handleMouseClick);
        unsubTts();
        eventBus.off('camera:requestState', requestCameraState);
        eventBus.off('camera:setMode', ({ mode }) => handleSetCameraMode(mode));
        eventBus.off('ui:editModeToggled', handleEditModeChange);
    };
  }, [onLoad]);

  return <Scene onLoad={handleSceneLoad} />;
};

export default VRMCanvas;