
import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import Panel from './Panel';
import { useAppContext } from '../contexts/AppContext';
import styles from './LightPanel.module.css';

interface LightPanelProps {
  onClose: () => void;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const LightPanel: React.FC<LightPanelProps> = ({ onClose, initialPos, onDragEnd }) => {
  const { directionalLight, ambientLight, vrmManager } = useAppContext();

  // State for light properties
  const [dirIntensity, setDirIntensity] = useState(2);
  const [dirColor, setDirColor] = useState('#ffffff');
  const [dirAngle, setDirAngle] = useState(45);
  const [dirDistance, setDirDistance] = useState(5);
  const [ambIntensity, setAmbIntensity] = useState(2);
  const [ambColor, setAmbColor] = useState('#404040');

  const updateLightPosition = useCallback((angle: number, distance: number) => {
    if (!directionalLight || !vrmManager?.currentVrm) return;

    const vrmCenter = vrmManager.currentVrm.scene.position;
    const angleRad = THREE.MathUtils.degToRad(angle);
    const lightHeight = directionalLight.position.y;

    const newX = vrmCenter.x + distance * Math.cos(angleRad);
    const newZ = vrmCenter.z + distance * Math.sin(angleRad);

    directionalLight.position.set(newX, lightHeight, newZ);
    directionalLight.target = vrmManager.currentVrm.scene;
  }, [directionalLight, vrmManager]);

  useEffect(() => {
    if (directionalLight) {
      setDirIntensity(directionalLight.intensity);
      setDirColor(`#${directionalLight.color.getHexString()}`);
      // Initialize angle and distance from current light position
      if (vrmManager?.currentVrm) {
        const vrmCenter = vrmManager.currentVrm.scene.position;
        const dx = directionalLight.position.x - vrmCenter.x;
        const dz = directionalLight.position.z - vrmCenter.z;
        setDirDistance(Math.sqrt(dx * dx + dz * dz));
        setDirAngle(THREE.MathUtils.radToDeg(Math.atan2(dz, dx)));
      }
    }
    if (ambientLight) {
      setAmbIntensity(ambientLight.intensity);
      setAmbColor(`#${ambientLight.color.getHexString()}`);
    }
  }, [directionalLight, ambientLight, vrmManager?.currentVrm]);

  const handleDirIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setDirIntensity(value);
    if (directionalLight) directionalLight.intensity = value;
  };

  const handleDirColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDirColor(value);
    if (directionalLight) directionalLight.color.set(value);
  };

  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setDirAngle(value);
    updateLightPosition(value, dirDistance);
  };

  const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setDirDistance(value);
    updateLightPosition(dirAngle, value);
  };

  const handleAmbIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setAmbIntensity(value);
    if (ambientLight) ambientLight.intensity = value;
  };

  const handleAmbColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmbColor(value);
    if (ambientLight) ambientLight.color.set(value);
  };

  return (
    <Panel title="조명 편집" onClose={onClose} initialPos={initialPos} onDragEnd={onDragEnd} width="320px">
      <div className={styles.content}>
        <h4 className={styles.header}>주 조명 (Directional)</h4>
        <div className={styles.controlRow}>
          <label>강도</label>
          <input type="range" min="0" max="5" step="0.1" value={dirIntensity} onChange={handleDirIntensityChange} />
          <span>{dirIntensity.toFixed(1)}</span>
        </div>
        <div className={styles.controlRow}>
          <label>색상</label>
          <input type="color" value={dirColor} onChange={handleDirColorChange} />
        </div>
        <div className={styles.controlRow}>
          <label>각도</label>
          <input type="range" min="0" max="360" step="1" value={dirAngle} onChange={handleAngleChange} />
          <span>{dirAngle.toFixed(0)}°</span>
        </div>
        <div className={styles.controlRow}>
          <label>거리</label>
          <input type="range" min="1" max="10" step="0.1" value={dirDistance} onChange={handleDistanceChange} />
          <span>{dirDistance.toFixed(1)}</span>
        </div>
        <hr className={styles.divider} />
        <h4 className={styles.header}>환경광 (Ambient)</h4>
        <div className={styles.controlRow}>
          <label>강도</label>
          <input type="range" min="0" max="5" step="0.1" value={ambIntensity} onChange={handleAmbIntensityChange} />
          <span>{ambIntensity.toFixed(1)}</span>
        </div>
        <div className={styles.controlRow}>
          <label>색상</label>
          <input type="color" value={ambColor} onChange={handleAmbColorChange} />
        </div>
      </div>
    </Panel>
  );
};

export default LightPanel;
