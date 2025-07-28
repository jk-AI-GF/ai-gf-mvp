import * as THREE from 'three';

export function onWindowResize(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// mousePosition은 전역 window 객체에 유지
(window as any).mousePosition = { x: 0, y: 0 };
document.addEventListener('mousemove', (event) => {
  (window as any).mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
  (window as any).mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
});
