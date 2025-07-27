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

const VRMCanvas: React.FC<VRMCanvasProps> = ({ onLoad }) => {
  const handleSceneLoad = useCallback((instances: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    plane: THREE.Mesh;
  }) => {
    const { scene, camera, renderer, controls, plane } = instances;

    // VRM Manager
    const vrmManager = new VRMManager(scene, camera, plane, eventBus);
    vrmManager.loadVRM('VRM/Liqu.vrm');

    // Plugin System
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
    };

    const pluginManager = new PluginManager(pluginContext);
    pluginManager.register(new AutoLookAtPlugin());
    pluginManager.register(new AutoBlinkPlugin());
    pluginManager.register(new AutoIdleAnimationPlugin());
    pluginManager.register(new ProactiveDialoguePlugin());
    pluginManager.register(new ActionTestPlugin());
    pluginManager.register(new GrabVrmPlugin());

    // Initialize ChatService after other managers are ready
    const chatService = new ChatService(vrmManager, pluginManager);

    // Pass managers up to the provider
    onLoad({ vrmManager, pluginManager, chatService });

    // Animation loop
    const clock = new THREE.Clock();
    const tempVector = new THREE.Vector3();
    const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        vrmManager.update(delta);
        if (vrmManager.currentVrm) {
            pluginManager.update(delta, vrmManager.currentVrm);
            
            // Calculate and emit head position for UI elements
            const head = vrmManager.currentVrm.humanoid.getNormalizedBoneNode('head');
            if (head) {
                const headPosition = head.getWorldPosition(tempVector);
                headPosition.project(camera);
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
        renderer.render(scene, camera);
    };
    animate();

    // Event listeners & IPC
    document.addEventListener('click', initAudioContext, { once: true });
    const unsubTts = window.electronAPI.on('tts-speak', (text: string) => playTTS(text));
    
    // VRM load/unload events for UI updates
    const handleVrmLoad = (payload: { vrm: VRM }) => {
        const vrm = payload.vrm;
        window.currentVrm = vrm; // Keep global for legacy UI parts if needed
        window.vrmExpressionList = Object.keys(vrm.expressionManager.expressionMap);
    };
    const handleVrmUnload = () => {
        window.currentVrm = null;
        window.vrmExpressionList = [];
    };
    vrmManager.eventBus.on('vrm:loaded', handleVrmLoad);
    vrmManager.eventBus.on('vrm:unloaded', handleVrmUnload);

    return () => {
        unsubTts();
        vrmManager.eventBus.off('vrm:loaded', handleVrmLoad);
        vrmManager.eventBus.off('vrm:unloaded', handleVrmUnload);
    };
  }, [onLoad]);

  return <Scene onLoad={handleSceneLoad} />;
};

export default VRMCanvas;
