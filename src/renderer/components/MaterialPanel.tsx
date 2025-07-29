
import React, { useState } from 'react';
import * as THREE from 'three';
import { MToonMaterial } from '@pixiv/three-vrm';
import Panel from './Panel';
import { useAppContext } from '../contexts/AppContext';
import styles from './MaterialPanel.module.css';

interface MaterialPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const MaterialPanel: React.FC<MaterialPanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const { vrmManager } = useAppContext();
  
  // MToonMaterial Accessors mapped to state
  const [shadeColor, setShadeColor] = useState('#808080');
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [outlineWidth, setOutlineWidth] = useState(0.005);
  const [rimColor, setRimColor] = useState('#ffffff');
  const [toonFactor, setToonFactor] = useState(1.0);
  const [rimFresnel, setRimFresnel] = useState(1.0);

  const applyToAllMToonMaterials = (updateFn: (material: MToonMaterial) => void) => {
    if (!vrmManager?.currentVrm) {
      console.warn('VRM is not loaded.');
      return;
    }

    vrmManager.currentVrm.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        materials.forEach(material => {
          if (material instanceof MToonMaterial) {
            updateFn(material);
          }
        });
      }
    });
  };

  // --- Handlers for each control ---

  const handleColorChange = (prop: 'shadeColorFactor' | 'outlineColorFactor' | 'parametricRimColorFactor', value: string) => {
    applyToAllMToonMaterials(material => {
      if (material[prop]) {
        (material[prop] as THREE.Color).set(value);
      }
    });
  };

  const handleSliderChange = (prop: 'outlineWidthFactor' | 'shadingToonyFactor' | 'parametricRimFresnelPowerFactor', value: number) => {
    applyToAllMToonMaterials(material => {
      if (typeof material[prop] === 'number') {
        (material as any)[prop] = value;
      }
    });
  };

  return (
    <Panel title="재질 일괄 편집" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd} width="320px">
      <div className={styles.content}>
        <div className={styles.controlRow}>
          <label>그림자 색</label>
          <input type="color" value={shadeColor} onChange={e => { setShadeColor(e.target.value); handleColorChange('shadeColorFactor', e.target.value); }} />
        </div>
        <div className={styles.controlRow}>
          <label>외곽선 색</label>
          <input type="color" value={outlineColor} onChange={e => { setOutlineColor(e.target.value); handleColorChange('outlineColorFactor', e.target.value); }} />
        </div>
        <div className={styles.controlRow}>
          <label>외곽선 굵기</label>
          <input type="range" min="0" max="0.05" step="0.001" value={outlineWidth} onChange={e => { const val = parseFloat(e.target.value); setOutlineWidth(val); handleSliderChange('outlineWidthFactor', val); }} />
          <span>{outlineWidth.toFixed(3)}</span>
        </div>
        <hr style={{ border: '1px solid #444', margin: '15px 0' }} />
        <div className={styles.controlRow}>
          <label>툰 셰이딩</label>
          <input type="range" min="0" max="1" step="0.01" value={toonFactor} onChange={e => { const val = parseFloat(e.target.value); setToonFactor(val); handleSliderChange('shadingToonyFactor', val); }} />
          <span>{toonFactor.toFixed(2)}</span>
        </div>
        <div className={styles.controlRow}>
          <label>림 라이트 색</label>
          <input type="color" value={rimColor} onChange={e => { setRimColor(e.target.value); handleColorChange('parametricRimColorFactor', e.target.value); }} />
        </div>
        <div className={styles.controlRow}>
          <label>림 라이트 세기</label>
          <input type="range" min="0" max="100" step="1" value={rimFresnel} onChange={e => { const val = parseFloat(e.target.value); setRimFresnel(val); handleSliderChange('parametricRimFresnelPowerFactor', val); }} />
          <span>{rimFresnel.toFixed(1)}</span>
        </div>
      </div>
    </Panel>
  );
};

export default MaterialPanel;
