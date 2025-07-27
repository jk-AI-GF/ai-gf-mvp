import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMManager } from '../vrm-manager';
import { PluginContext } from '../../plugin-api/plugin-context';
import { PluginManager } from '../../plugins/plugin-manager';
import { AutoLookAtPlugin } from '../../plugins/auto-look-at-plugin';
import { AutoBlinkPlugin } from '../../plugins/auto-blink-plugin';
import { AutoIdleAnimationPlugin } from '../../plugins/auto-idle-animation-plugin';
import { ProactiveDialoguePlugin } from '../../plugins/proactive-dialogue-plugin';
import { ActionTestPlugin } from '../../plugins/action-test-plugin';
import { GrabVrmPlugin } from '../../plugins/grab-vrm-plugin';
import { Actions } from '../../plugin-api/actions';
import { SystemControls } from '../../plugin-api/system-controls';
import eventBus from '../../core/event-bus';
import { TriggerEngine } from '../../core/trigger-engine';
import { characterState } from '../../core/character-state';
import { setClearColor, toggleCameraMode, onWindowResize, DEFAULT_FREE_CAMERA_POSITION, DEFAULT_FREE_CAMERA_ROTATION, getIntersectedObject } from '../scene-utils';
import { initAudioContext, playTTS, toggleTts, setMasterVolume } from '../audio-service';

// Define the shape of the context data
interface AppContextType {
  vrmManager: VRMManager | null;
  pluginContext: PluginContext | null;
  pluginManager: PluginManager | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControls | null;
}

// Create the context with a default value of null
const AppContext = createContext<AppContextType | null>(null);

// Create a custom hook for easy access to the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Create the provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vrmManager, setVrmManager] = useState<VRMManager | null>(null);
  const [pluginContext, setPluginContext] = useState<PluginContext | null>(null);
  const [pluginManager, setPluginManager] = useState<PluginManager | null>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);

  useEffect(() => {
    // Basic setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(DEFAULT_FREE_CAMERA_POSITION);
    camera.rotation.copy(DEFAULT_FREE_CAMERA_ROTATION);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    setClearColor(renderer, 0x000000);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const canvasContainer = document.getElementById('canvas-container');
    canvasContainer.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(2, 5, 3);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.7 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.601;
    plane.receiveShadow = true;
    plane.material.depthWrite = false;
    scene.add(plane);

    // VRM Manager
    const vrmManager = new VRMManager(scene, camera, plane, eventBus);
    vrmManager.loadVRM('VRM/Liqu.vrm');

    // Plugin System
    const triggerEngine = new TriggerEngine();
    const actions: Actions = {
        playAnimation: async (animationName: string, loop?: boolean, crossFadeDuration?: number) => {
            const result = await vrmManager.loadAndParseFile(animationName);
            if (result?.type === 'animation') {
                vrmManager.playAnimation(result.data, loop, crossFadeDuration);
            } else if (result?.type === 'pose') {
                console.warn(`[Action] playAnimation was called with a pose file: ${animationName}. Use setPose instead.`);
                vrmManager.applyPose(result.data);
            }
        },
        showMessage: (message: string, duration?: number) => {
            eventBus.emit('chat:newMessage', { role: 'assistant', text: message });
        },
        setExpression: (expressionName: string, weight: number, duration?: number) => {
            vrmManager.animateExpression(expressionName, weight, duration);
        },
        setPose: async (poseName: string) => {
            const result = await vrmManager.loadAndParseFile(`Pose/${poseName}`);
            if (result?.type === 'pose') {
                vrmManager.applyPose(result.data);
            } else if (result?.type === 'animation') {
                console.warn(`[Action] setPose was called with an animation file: ${poseName}. Use playAnimation instead.`);
                vrmManager.playAnimation(result.data, false);
            }
        },
        lookAt: (target: 'camera' | 'mouse' | [number, number, number] | null) => {
            if (target === 'camera') {
                vrmManager.lookAt('camera');
            } else if (target === 'mouse') {
                vrmManager.lookAt('mouse');
            } else if (Array.isArray(target)) {
                vrmManager.lookAt(new THREE.Vector3(target[0], target[1], target[2]));
            } else if (target === null) {
                vrmManager.lookAt(null);
            }
        },
        setContext: (key: string, value: any) => {
            window.electronAPI.send('context:set', key, value);
        },
        changeBackground: (imagePath: string) => {
            document.body.style.backgroundImage = `url('${imagePath}')`;
            document.body.style.backgroundColor = 'transparent';
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            renderer.setClearAlpha(0);
        },
        getContext: async (key: string): Promise<any> => {
            return window.electronAPI.invoke('context:get', key);
        },
        speak: playTTS,
    };

    const systemControls: SystemControls = {
        toggleTts: (enable: boolean) => {
            toggleTts(enable);
        },
        setMasterVolume: (volume: number) => {
            setMasterVolume(volume);
        },
    };

    const pluginContext: PluginContext = {
        eventBus: eventBus,
        registerTrigger: (trigger) => triggerEngine.registerTrigger(trigger),
        actions: actions,
        system: systemControls,
        characterState: characterState,
    };

    const pluginManager = new PluginManager(pluginContext);
    // Register plugins
    pluginManager.register(new AutoLookAtPlugin());
    pluginManager.register(new AutoBlinkPlugin());
    pluginManager.register(new AutoIdleAnimationPlugin());
    pluginManager.register(new ProactiveDialoguePlugin());
    pluginManager.register(new ActionTestPlugin());
    pluginManager.register(new GrabVrmPlugin());

    // Set state
    setVrmManager(vrmManager);
    setPluginContext(pluginContext);
    setPluginManager(pluginManager);
    setScene(scene);
    setCamera(camera);
    setControls(controls);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        vrmManager.update(delta);
        if (vrmManager.currentVrm) {
            pluginManager.update(delta, vrmManager.currentVrm);
        }
        controls.update();
        renderer.render(scene, camera);
    };
    animate();

    // Event listeners
    window.addEventListener('resize', () => onWindowResize(camera, renderer));
    document.addEventListener('click', initAudioContext, { once: true });

    // IPC handlers
    window.electronAPI.on('tts-speak', (text: string) => {
        playTTS(text);
    });

    // Cleanup
    return () => {
        window.removeEventListener('resize', () => onWindowResize(camera, renderer));
        // Any other cleanup logic
    };
  }, []);

  const value = {
    vrmManager,
    pluginContext,
    pluginManager,
    scene,
    camera,
    controls,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};