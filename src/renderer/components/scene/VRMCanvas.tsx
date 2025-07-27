import React, { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRM } from '@pixiv/three-vrm';
import Scene from './Scene';
import { VRMManager } from '../../vrm-manager';
import { PluginManager } from '../../../plugins/plugin-manager';
import { PluginContext } from '../../../plugin-api/plugin-context';
import { Actions } from '../../../plugin-api/actions';
import { SystemControls } from '../../../plugin-api/system-controls';
import eventBus from '../../../core/event-bus';
import { TriggerEngine } from '../../../core/trigger-engine';
import { characterState } from '../../../core/character-state';
import { initAudioContext, playTTS, toggleTts, setMasterVolume } from '../../audio-service';
import { AutoLookAtPlugin } from '../../../plugins/auto-look-at-plugin';
import { AutoBlinkPlugin } from '../../../plugins/auto-blink-plugin';
import { AutoIdleAnimationPlugin } from '../../../plugins/auto-idle-animation-plugin';
import { ProactiveDialoguePlugin } from '../../../plugins/proactive-dialogue-plugin';
import { ActionTestPlugin } from '../../../plugins/action-test-plugin';
import { GrabVrmPlugin } from '../../../plugins/grab-vrm-plugin';
import { ChatService } from '../../chat-service';

interface VRMCanvasProps {
  onLoad: (managers: { vrmManager: VRMManager; pluginManager: PluginManager; chatService: ChatService }) => void;
}

import { onWindowResize } from '../../scene-utils';

// ... (imports)

const VRMCanvas: React.FC<VRMCanvasProps> = ({ onLoad }) => {
  const handleSceneLoad = useCallback((instances: {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    plane: THREE.Mesh;
  }) => {
    const { scene, renderer, plane } = instances;

    // --- Camera and Controls Setup ---
    let cameraMode: 'orbit' | 'fixed' = 'orbit';
    const perspectiveCamera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    perspectiveCamera.position.set(0, 1.2, 3);
    
    const orthographicCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
    orthographicCamera.position.set(0, 1.2, 3); // Closer position
    orthographicCamera.zoom = 1.2; // Increased zoom
    orthographicCamera.updateProjectionMatrix();

    let activeCamera: THREE.Camera = perspectiveCamera;

    const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    // --- VRM Manager ---
    const vrmManager = new VRMManager(scene, perspectiveCamera, plane, eventBus);
    vrmManager.loadVRM('VRM/Liqu.vrm');

    // --- Plugin System ---
    const triggerEngine = new TriggerEngine();
    const actions: Actions = {
        playAnimation: async (animationName, loop, crossFadeDuration) => {
            const result = await vrmManager.loadAndParseFile(animationName);
            if (result?.type === 'animation') vrmManager.playAnimation(result.data, loop, crossFadeDuration);
            else if (result?.type === 'pose') vrmManager.applyPose(result.data);
        },
        showMessage: (message, duration) => eventBus.emit('chat:newMessage', { role: 'assistant', text: message }),
        setExpression: (expressionName, weight, duration) => vrmManager.animateExpression(expressionName, weight, duration),
        setPose: async (poseName) => {
            const result = await vrmManager.loadAndParseFile(`Pose/${poseName}`);
            if (result?.type === 'pose') vrmManager.applyPose(result.data);
            else if (result?.type === 'animation') vrmManager.playAnimation(result.data, false);
        },
        lookAt: (target) => {
            if (target === 'camera') vrmManager.lookAt('camera');
            else if (target === 'mouse') vrmManager.lookAt('mouse');
            else if (Array.isArray(target)) vrmManager.lookAt(new THREE.Vector3(...target));
            else vrmManager.lookAt(null);
        },
        setContext: (key, value) => window.electronAPI.send('context:set', key, value),
        changeBackground: (imagePath) => {
            document.body.style.backgroundImage = `url('${imagePath}')`;
            document.body.style.backgroundColor = 'transparent';
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            renderer.setClearAlpha(0);
        },
        getContext: (key) => window.electronAPI.invoke('context:get', key),
        speak: playTTS,
    };

    const systemControls: SystemControls = {
        toggleTts: toggleTts,
        setMasterVolume: setMasterVolume,
    };

    const pluginContext: PluginContext = {
        eventBus,
        registerTrigger: triggerEngine.registerTrigger.bind(triggerEngine),
        actions,
        system: systemControls,
        characterState,
        vrmManager,
    };

    const pluginManager = new PluginManager(pluginContext);
    pluginManager.register(new AutoLookAtPlugin());
    pluginManager.register(new AutoBlinkPlugin());
    pluginManager.register(new AutoIdleAnimationPlugin());
    pluginManager.register(new ProactiveDialoguePlugin());
    pluginManager.register(new ActionTestPlugin());
    pluginManager.register(new GrabVrmPlugin());

    // --- Chat Service ---
    const chatService = new ChatService(vrmManager, pluginManager);

    // Pass managers up to the provider
    onLoad({ vrmManager, pluginManager, chatService });

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    const tempVector = new THREE.Vector3();
    const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        vrmManager.update(delta);
        if (vrmManager.currentVrm) {
            pluginManager.update(delta, vrmManager.currentVrm);
            
            const head = vrmManager.currentVrm.humanoid.getNormalizedBoneNode('head');
            if (head) {
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
        if (activeCamera instanceof THREE.PerspectiveCamera) {
            activeCamera.aspect = window.innerWidth / window.innerHeight;
            activeCamera.updateProjectionMatrix();
        } else if (activeCamera instanceof THREE.OrthographicCamera) {
            // You might need to adjust the frustum here for orthographic cameras
            // For now, just updating the projection matrix is enough
            activeCamera.updateProjectionMatrix();
        }
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const toggleCameraMode = () => {
        if (cameraMode === 'orbit') {
            cameraMode = 'fixed';
            activeCamera = orthographicCamera;
            controls.enabled = false;
            eventBus.emit('camera:modeChanged', 'follow'); // Emitting 'follow' for UI
        } else {
            cameraMode = 'orbit';
            activeCamera = perspectiveCamera;
            // Ensure aspect ratio is correct when switching back
            perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
            perspectiveCamera.updateProjectionMatrix();
            controls.enabled = true;
            eventBus.emit('camera:modeChanged', 'free'); // Emitting 'free' for UI
        }
    };

    const requestCameraState = () => {
        eventBus.emit('camera:modeChanged', cameraMode === 'orbit' ? 'free' : 'follow');
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleMouseClick);
    document.addEventListener('click', initAudioContext, { once: true });
    const unsubTts = window.electronAPI.on('tts-speak', (text: string) => playTTS(text));
    eventBus.on('camera:toggleMode', toggleCameraMode);
    eventBus.on('camera:requestState', requestCameraState);
    
    const handleVrmLoad = (payload: { vrm: VRM }) => {
        window.currentVrm = payload.vrm;
        window.vrmExpressionList = Object.keys(payload.vrm.expressionManager.expressionMap);
    };
    const handleVrmUnload = () => {
        window.currentVrm = null;
        window.vrmExpressionList = [];
    };
    vrmManager.eventBus.on('vrm:loaded', handleVrmLoad);
    vrmManager.eventBus.on('vrm:unloaded', handleVrmUnload);

    // --- Cleanup ---
    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousedown', handleMouseClick);
        unsubTts();
        eventBus.off('camera:toggleMode', toggleCameraMode);
        eventBus.off('camera:requestState', requestCameraState);
        vrmManager.eventBus.off('vrm:loaded', handleVrmLoad);
        vrmManager.eventBus.off('vrm:unloaded', handleVrmUnload);
    };
  }, [onLoad]);

  return <Scene onLoad={handleSceneLoad} />;
};

export default VRMCanvas;
