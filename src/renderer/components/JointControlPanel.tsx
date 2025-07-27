import React, { useState, useEffect, useCallback } from 'react';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import * as THREE from 'three';
import eventBus from '../../core/event-bus';
import BoneSlider from './BoneSlider';
import Panel from './Panel';
import { useAppContext } from '../contexts/AppContext'; // useAppContext 임포트

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
  const { pluginManager } = useAppContext(); // useAppContext 사용
  const [bones, setBones] = useState<BoneInfo[]>([]);

  const updateBoneStateFromVrm = useCallback(() => {
    const vrm = pluginManager?.context.vrmManager?.currentVrm; // pluginManager를 통해 vrm에 접근
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
  }, [pluginManager]);

  useEffect(() => {
    // 컴포넌트 마운트 시 vrmManager가 준비되었는지 확인 후 상태 업데이트
    if (pluginManager?.context.vrmManager?.currentVrm) {
      updateBoneStateFromVrm();
    }

    const unsubscribeLoaded = eventBus.on('vrm:loaded', updateBoneStateFromVrm);
    const unsubscribePoseApplied = eventBus.on('vrm:poseApplied', updateBoneStateFromVrm);
    const unsubscribeUnloaded = eventBus.on('vrm:unloaded', () => setBones([]));
    
    return () => {
      unsubscribeLoaded();
      unsubscribePoseApplied();
      unsubscribeUnloaded();
    };
  }, [pluginManager, updateBoneStateFromVrm]);

  const handleSliderChange = useCallback((boneName: VRMHumanBoneName, axis: 'x' | 'y' | 'z', value: number) => {
    const vrm = pluginManager?.context.vrmManager?.currentVrm;
    if (!vrm) return;
    const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName);
    if (!boneNode) return;
    setBones(prevBones => {
        const newBones = prevBones.map(b => b.boneName === boneName ? { ...b, [axis]: value } : b);
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
  }, [pluginManager]);
  
  const resetBone = useCallback((boneName: VRMHumanBoneName) => {
    const vrm = pluginManager?.context.vrmManager?.currentVrm;
    if (!vrm) return;
    const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName);
    if (!boneNode) return;
    // Resetting to identity quaternion
    boneNode.quaternion.set(0, 0, 0, 1);
    vrm.humanoid.getNormalizedBoneNode(boneName)?.updateWorldMatrix(true, true);
    updateBoneStateFromVrm();
  }, [pluginManager, updateBoneStateFromVrm]);

  return (
    <Panel title="관절 조절" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd}>
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
    </Panel>
  );
};

export default JointControlPanel;
