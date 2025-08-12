import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { VRMSpringBoneColliderShapeCapsule, VRMSpringBoneColliderShapeSphere, VRMSpringBoneJoint, VRMSpringBoneCollider } from '@pixiv/three-vrm';
import { useAppContext } from '../contexts/AppContext';
import styles from './VrmScaleSlider.module.css';

// Store initial values to avoid cumulative scaling errors
interface InitialJointSettings {
  stiffness: number;
  hitRadius: number;
}

interface InitialColliderSettings {
  radius: number;
  tail?: THREE.Vector3;
}

const VrmScaleSlider: React.FC = () => {
  const { vrmManager } = useAppContext();
  const [scale, setScale] = useState(1.0);

  const initialJointSettings = useRef<Map<VRMSpringBoneJoint, InitialJointSettings>>(new Map());
  const initialColliderSettings = useRef<Map<VRMSpringBoneCollider, InitialColliderSettings>>(new Map());

  // Capture initial parameters when a new VRM is loaded
  useEffect(() => {
    if (!vrmManager?.currentVrm) {
      return;
    }

    const { currentVrm: vrm } = vrmManager;
    const jointSettings = new Map<VRMSpringBoneJoint, InitialJointSettings>();
    const colliderSettings = new Map<VRMSpringBoneCollider, InitialColliderSettings>();

    vrm.springBoneManager?.joints.forEach((joint: VRMSpringBoneJoint) => {
      jointSettings.set(joint, {
        stiffness: joint.settings.stiffness,
        hitRadius: joint.settings.hitRadius,
      });
    });

    vrm.springBoneManager?.colliders.forEach((collider: VRMSpringBoneCollider) => {
      const shape = collider.shape;
      if (shape instanceof VRMSpringBoneColliderShapeCapsule) {
        colliderSettings.set(collider, {
          radius: shape.radius,
          tail: shape.tail.clone(),
        });
      } else if (shape instanceof VRMSpringBoneColliderShapeSphere) {
        colliderSettings.set(collider, {
          radius: shape.radius,
        });
      }
    });

    initialJointSettings.current = jointSettings;
    initialColliderSettings.current = colliderSettings;
    
    // Reset slider and model scale to 1 for the new model
    setScale(1.0);
    vrm.scene.scale.setScalar(1.0);

  }, [vrmManager?.currentVrm]);

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale);

    const vrm = vrmManager?.currentVrm;
    if (!vrm) return;

    // Scale the main scene
    vrm.scene.scale.setScalar(newScale);

    // Scale spring bone joints based on initial values
    vrm.springBoneManager?.joints.forEach((joint: VRMSpringBoneJoint) => {
      const initial = initialJointSettings.current.get(joint);
      if (initial) {
        joint.settings.stiffness = initial.stiffness * newScale;
        joint.settings.hitRadius = initial.hitRadius * newScale;
      }
    });

    // Scale spring bone colliders based on initial values
    vrm.springBoneManager?.colliders.forEach((collider: VRMSpringBoneCollider) => {
      const initial = initialColliderSettings.current.get(collider);
      const shape = collider.shape;
      if (initial) {
        if (shape instanceof VRMSpringBoneColliderShapeCapsule && initial.tail) {
          shape.radius = initial.radius * newScale;
          shape.tail.copy(initial.tail).multiplyScalar(newScale);
        } else if (shape instanceof VRMSpringBoneColliderShapeSphere) {
          shape.radius = initial.radius * newScale;
        }
      }
    });
  }, [vrmManager]);

  if (!vrmManager?.currentVrm) {
    return null;
  }

  return (
    <div className={styles.sliderContainer}>
      <label htmlFor="vrmScale" className={styles.sliderLabel}>스케일</label>
      <input
        type="range"
        id="vrmScale"
        min="0.1"
        max="3.0"
        step="0.01"
        value={scale}
        onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
        className={styles.slider}
      />
      <span>{scale.toFixed(2)}</span>
    </div>
  );
};

export default VrmScaleSlider;
