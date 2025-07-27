import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { onWindowResize } from '../../scene-utils';

interface SceneProps {
  onLoad: (instances: {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    plane: THREE.Mesh;
  }) => void;
}

const Scene: React.FC<SceneProps> = ({ onLoad }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

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

    // Pass instances to parent
    onLoad({ scene, renderer, plane });

    // Event listeners
    const handleResize = () => {
        // We need a camera to call onWindowResize, but it's managed by the parent now.
        // This logic will need to be handled in VRMCanvas.tsx
    };
    // window.addEventListener('resize', handleResize); // This will be moved

    // Cleanup
    return () => {
      // window.removeEventListener('resize', handleResize);
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
  }, [onLoad]);

  return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }} />;
};

export default Scene;
