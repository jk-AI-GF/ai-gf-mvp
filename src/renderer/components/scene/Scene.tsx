import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { onWindowResize } from '../../scene-utils';
import { useAppContext } from '../../contexts/AppContext';

interface SceneProps {
  onLoad: (instances: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    plane: THREE.Mesh;
  }) => void;
}

const Scene: React.FC<SceneProps> = ({ onLoad }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { setDirectionalLight, setAmbientLight } = useAppContext();

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.2, 3);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(2, 5, 3);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    scene.add(light);
    setDirectionalLight(light); // Set light in global context

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    setAmbientLight(ambientLight); // Set ambient light in global context

    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.7 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.material.depthWrite = false;
    scene.add(plane);

    // Pass instances to parent
    onLoad({ scene, camera, renderer, controls, plane });

    // Event listeners
    const handleResize = () => onWindowResize(camera, renderer);
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      // Dispose Three.js objects to prevent memory leaks
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [onLoad, setDirectionalLight, setAmbientLight]);

  return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }} />;
};

export default Scene;
