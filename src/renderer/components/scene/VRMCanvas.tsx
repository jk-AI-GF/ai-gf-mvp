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
import { GrabVrmPlugin } from '../../../plugins/grab-vrm-plugin';
import { TimeSyncTestPlugin } from '../../../plugins/time-sync-test-plugin'; // Import the new plugin
import { ChatService } from '../../chat-service';

interface VRMCanvasProps {
  onLoad: (managers: { vrmManager: VRMManager; pluginManager: PluginManager; chatService: ChatService }) => void;
}

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
    perspectiveCamera.position.set(0, 0.6, 3);
    
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
    orthographicCamera.position.set(0, 0.6, 2.5);
    orthographicCamera.zoom = 1.2; // Zoom을 조정하여 캐릭터 크기를 맞춥니다.
    orthographicCamera.updateProjectionMatrix();

    let activeCamera: THREE.Camera = perspectiveCamera;

    const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    // --- VRM Manager ---
    const vrmManager = new VRMManager(scene, activeCamera, plane, eventBus);
    vrmManager.loadVRM('VRM/Liqu.vrm');

    // --- Plugin System ---
    const triggerEngine = new TriggerEngine();
    const pluginContext = createPluginContext(vrmManager, triggerEngine, renderer);

    const pluginManager = new PluginManager(pluginContext);
    pluginManager.register(new AutoLookAtPlugin());
    pluginManager.register(new AutoBlinkPlugin());
    pluginManager.register(new AutoIdleAnimationPlugin());
    pluginManager.register(new ProactiveDialoguePlugin());
    pluginManager.register(new ActionTestPlugin());
    pluginManager.register(new GrabVrmPlugin());
    pluginManager.register(new TimeSyncTestPlugin()); // Register the new plugin

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
    const unsubSetExpressionWeight = window.electronAPI.on('set-expression-weight', (expressionName: string, weight: number) => {
        if (vrmManager.currentVrm?.expressionManager) {
            vrmManager.currentVrm.expressionManager.setValue(expressionName, weight);
        }
    });
    eventBus.on('camera:toggleMode', toggleCameraMode);
    eventBus.on('camera:requestState', requestCameraState);

    // --- Cleanup ---
    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousedown', handleMouseClick);
        unsubTts();
        unsubSetExpressionWeight();
        eventBus.off('camera:toggleMode', toggleCameraMode);
        eventBus.off('camera:requestState', requestCameraState);
    };
  }, [onLoad]);

  return <Scene onLoad={handleSceneLoad} />;
};

export default VRMCanvas;
