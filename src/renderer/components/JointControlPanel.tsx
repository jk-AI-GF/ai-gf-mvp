import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import * as THREE from 'three';
import eventBus from '../../core/event-bus';
import BoneSlider from './BoneSlider';
import { useDraggable } from '../hooks/useDraggable';

interface JointControlPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

type BoneInfo = {
  boneName: VRMHumanBoneName;
  x: number;
  y: number;
  z: number;
};

const JointControlPanel: React.FC<JointControlPanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const [bones, setBones] = useState<BoneInfo[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const { x, y } = useDraggable({ handleRef, initialPos, onDragEnd });

  const updateBoneStateFromVrm = useCallback(() => {
    const vrm = (window as any).currentVrm as VRM | undefined;
    if (!vrm) {
      setBones([]);
      return;
    }

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
    const unsubscribeLoaded = eventBus.on('vrm:loaded', updateBoneStateFromVrm);
    const unsubscribeUnloaded = eventBus.on('vrm:unloaded', () => setBones([]));
    
    return () => {
      unsubscribe();
      unsubscribeLoaded();
      unsubscribeUnloaded();
    };
  }, [updateBoneStateFromVrm]);

  const handleSliderChange = useCallback((boneName: VRMHumanBoneName, axis: 'x' | 'y' | 'z', value: number) => {
    const vrm = (window as any).currentVrm as VRM | undefined;
    if (!vrm) return;

    const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName);
    if (!boneNode) return;

    setBones(prevBones => {
        const newBones = prevBones.map(b => {
            if (b.boneName === boneName) {
                return { ...b, [axis]: value };
            }
            return b;
        });

        const targetBone = newBones.find(b => b.boneName === boneName);
        if (targetBone) {
            const euler = new THREE.Euler(
                THREE.MathUtils.degToRad(targetBone.x),
                THREE.MathUtils.degToRad(targetBone.y),
                THREE.MathUtils.degToRad(targetBone.z),
                'XYZ'
            );
            boneNode.setRotationFromEuler(euler);
        }
        return newBones;
    });
  }, []);
  
  const resetBone = useCallback((boneName: VRMHumanBoneName) => {
    const vrm = (window as any).currentVrm as VRM | undefined;
    if (!vrm) return;
    const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName);
    if (!boneNode) return;

    boneNode.quaternion.set(0, 0, 0, 1);
    updateBoneStateFromVrm();
  }, [updateBoneStateFromVrm]);

  return (
    <div className={`panel-container ${isCollapsed ? 'collapsed' : ''}`} style={{ top: y, left: x }}>
      <div className="panel-header" ref={handleRef} style={{ cursor: 'move' }}>
        <h3 className="panel-title">관절 조절</h3>
        <div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="panel-close-button" style={{ right: '40px' }}>{isCollapsed ? '□' : '−'}</button>
          <button onClick={onClose} className="panel-close-button">×</button>
        </div>
      </div>
      <div className="panel-content">
        {bones.length === 0 ? (
          <p className="empty-message">VRM 모델을 로드해주세요.</p>
        ) : (
          bones.map((bone) => (
            <BoneSlider
              key={bone.boneName}
              {...bone}
              onSliderChange={handleSliderChange}
              onReset={resetBone}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default JointControlPanel;
