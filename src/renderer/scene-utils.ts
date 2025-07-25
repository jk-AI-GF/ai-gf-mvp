import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let isFreeCameraMode = true;

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0.0, -0.1, 3.5);
const DEFAULT_CAMERA_ROTATION = new THREE.Euler(0.14, 0.0, 0.0);
export const DEFAULT_FREE_CAMERA_POSITION = new THREE.Vector3(0.0, 0.0, 3.0);
export const DEFAULT_FREE_CAMERA_ROTATION = new THREE.Euler(0.0, 0.0, 0.0);

const tempVector = new THREE.Vector3();

export function setClearColor(renderer: THREE.WebGLRenderer, color: number) {
  renderer.setClearColor(color, 0.1);
}

export function toggleCameraMode(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  isFreeCameraMode = !isFreeCameraMode;
  if (controls) controls.enabled = isFreeCameraMode;
  if (!isFreeCameraMode) {
    // Fixed camera mode
    controls.reset();
    controls.enabled = false;
    camera.position.copy(DEFAULT_CAMERA_POSITION);
    camera.rotation.copy(DEFAULT_CAMERA_ROTATION);
    camera.fov = 20; // Set lower FOV for fixed mode
  } else {
    // Free camera mode
    camera.position.copy(DEFAULT_FREE_CAMERA_POSITION);
    camera.rotation.copy(DEFAULT_FREE_CAMERA_ROTATION);
    camera.fov = 35; // Reset to default FOV for free mode
    controls.enabled = true;
  }

  camera.updateMatrix();
  console.log(`Camera mode: ${isFreeCameraMode ? 'Free' : 'Fixed'}`);
}

export function onWindowResize(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Converts 2D mouse coordinates to a 3D point in the Three.js scene, intersecting with the ground plane.
 * @param camera The Three.js camera.
 * @param plane The ground plane mesh.
 * @returns A THREE.Vector3 representing the 3D point, or null if no intersection.
 */
export function get3DPointFromMouse(camera: THREE.PerspectiveCamera, plane: THREE.Mesh): THREE.Vector3 {
  const mouse = new THREE.Vector2((window as any).mousePosition.x, (window as any).mousePosition.y);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Create a plane in front of the camera
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  const cameraPosition = new THREE.Vector3();
  camera.getWorldPosition(cameraPosition);

  const planeDistance = 1.5; // Distance of the plane from the camera
  const planePoint = new THREE.Vector3().addVectors(cameraPosition, cameraDirection.multiplyScalar(planeDistance));
  const dynamicPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDirection.negate(), planePoint);

  const intersectionPoint = new THREE.Vector3();
  const point = raycaster.ray.intersectPlane(dynamicPlane, intersectionPoint);

  if (point) {
    return point;
  }

  // Fallback: if no intersection, use the old ground plane method
  const intersects = raycaster.intersectObject(plane); // `plane` is the ground plane mesh
  if (intersects.length > 0) {
    return intersects[0].point;
  }

  // Final fallback: a point in front of the camera
  const fallbackPoint = new THREE.Vector3();
  raycaster.ray.at(10, fallbackPoint);
  return fallbackPoint;
}

// mousePosition은 전역 window 객체에 유지
(window as any).mousePosition = { x: 0, y: 0 };
document.addEventListener('mousemove', (event) => {
  (window as any).mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
  (window as any).mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
});
