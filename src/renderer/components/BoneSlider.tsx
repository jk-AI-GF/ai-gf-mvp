import React from 'react';
import { VRMHumanBoneName } from '@pixiv/three-vrm';

interface BoneSliderProps {
  boneName: VRMHumanBoneName;
  x: number;
  y: number;
  z: number;
  onSliderChange: (boneName: VRMHumanBoneName, axis: 'x' | 'y' | 'z', value: number) => void;
  onReset: (boneName: VRMHumanBoneName) => void;
}

const BoneSlider: React.FC<BoneSliderProps> = React.memo(({ boneName, x, y, z, onSliderChange, onReset }) => {
  console.log(`Rendering BoneSlider for: ${boneName}`); // For debugging re-renders
  return (
    <div style={{ marginBottom: '15px' }} data-bone-name={boneName}>
      <label style={{ display: 'block' }}>{boneName}</label>
      {['x', 'y', 'z'].map(axis => (
        <div key={axis} style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ width: '20px' }}>{axis.toUpperCase()}</span>
          <input
            type="range"
            min="-180"
            max="180"
            value={axis === 'x' ? x : axis === 'y' ? y : z}
            onChange={(e) => onSliderChange(boneName, axis as 'x' | 'y' | 'z', parseInt(e.target.value))}
          />
        </div>
      ))}
      <button onClick={() => onReset(boneName)} style={{ marginTop: '5px', padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem' }}>
        초기화
      </button>
    </div>
  );
});

export default BoneSlider;
