import React, { useState, useEffect, useCallback } from 'react';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import * as THREE from 'three';
import eventBus from '../../core/event-bus';

interface JointControlPanelProps {
  onClose: () => void;
}

type BoneInfo = {
  boneName: VRMHumanBoneName;
  x: number;
  y: number;
  z: number;
};

const JointControlPanel: React.FC<JointControlPanelProps> = ({ onClose }) => {
  const [currentVrm, setCurrentVrm] = useState<VRM | null>(null);
  const [bones, setBones] = useState<BoneInfo[]>([]);

  const updateBoneStateFromVrm = useCallback(() => {
    const vrm = (window as any).currentVrm as VRM | undefined;
    if (!vrm) return;

    setCurrentVrm(vrm);
    const latestBones = Object.values(VRMHumanBoneName).map(boneName => {
      const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName);
      if (!boneNode) return null;
      const euler = new THREE.Euler().setFromQuaternion(boneNode.quaternion, 'XYZ');
      return {
        boneName,
        x: THREE.MathUtils.radToDeg(euler.x),
        y: THREE.MathUtils.radToDeg(euler.y),
        z: THREE.MathUtils.radToDeg(euler.z),
      };
    }).filter((b): b is BoneInfo => b !== null);
    setBones(latestBones);
  }, []);

  useEffect(() => {
    updateBoneStateFromVrm();
    const unsubscribe = eventBus.on('vrm:poseApplied', updateBoneStateFromVrm);
    return () => {
      unsubscribe();
    };
  }, [updateBoneStateFromVrm]);

  const handleSliderChange = (boneName: VRMHumanBoneName, axis: 'x' | 'y' | 'z', value: number) => {
    if (!currentVrm) return;
    const boneNode = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    if (!boneNode) return;

    const updatedBones = bones.map(b => b.boneName === boneName ? { ...b, [axis]: value } : b);
    setBones(updatedBones);

    const targetBone = updatedBones.find(b => b.boneName === boneName);
    if (targetBone) {
      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(targetBone.x),
        THREE.MathUtils.degToRad(targetBone.y),
        THREE.MathUtils.degToRad(targetBone.z),
        'XYZ'
      );
      boneNode.setRotationFromEuler(euler);
    }
  };
  
  const resetBone = (boneName: VRMHumanBoneName) => {
    if (!currentVrm) return;
    const boneNode = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    if (!boneNode) return;

    boneNode.quaternion.set(0, 0, 0, 1);
    const updatedBones = bones.map(b => b.boneName === boneName ? { ...b, x: 0, y: 0, z: 0 } : b);
    setBones(updatedBones);
  };

  return (
    <div className="control-panel" style={{ display: 'block', maxHeight: '80vh', overflowY: 'auto' }}>
      <button className="control-panel-minimize-button">-</button>
      <button className="control-panel-close-button" onClick={onClose}>×</button>
      <h3>관절 조절</h3>
      <div id="joint-sliders">
        {!currentVrm ? (
          <p style={{ color: 'white' }}>VRM을 로드해주세요.</p>
        ) : (
          bones.map(({ boneName, x, y, z }) => (
            <div key={boneName} style={{ marginBottom: '15px' }} data-bone-name={boneName}>
              <label style={{ display: 'block' }}>{boneName}</label>
              {['x', 'y', 'z'].map(axis => (
                <div key={axis} style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '20px' }}>{axis.toUpperCase()}</span>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={axis === 'x' ? x : axis === 'y' ? y : z}
                    onChange={(e) => handleSliderChange(boneName, axis as 'x' | 'y' | 'z', parseInt(e.target.value))}
                  />
                </div>
              ))}
              <button onClick={() => resetBone(boneName)} style={{ marginTop: '5px', padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem' }}>
                초기화
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JointControlPanel;