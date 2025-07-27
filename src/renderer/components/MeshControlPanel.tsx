import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { useDraggable } from '../hooks/useDraggable';

interface MeshControlPanelProps {
  onClose: () => void;
  vrmManager: any;
  initialPos: { x: number, y: number };
  onDragEnd: (pos: { x: number, y: number }) => void;
}

const MeshControlPanel: React.FC<MeshControlPanelProps> = ({ onClose, vrmManager, initialPos, onDragEnd }) => {
  const [meshes, setMeshes] = useState<{ name: string; visible: boolean }[]>([]);
  const [currentVrm, setCurrentVrm] = useState<VRM | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const { x, y } = useDraggable({ handleRef, initialPos, onDragEnd });

  const listVrmMeshes = useCallback((vrm: VRM | null): { name: string; visible: boolean }[] => {
    if (!vrm) return [];
    const meshInfo: { name: string; visible: boolean }[] = [];
    vrm.scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        meshInfo.push({ name: object.name, visible: object.visible });
      }
    });
    return meshInfo;
  }, []);

  const toggleVrmMeshVisibility = (meshName: string) => {
    if (!currentVrm) return;
    let found = false;
    currentVrm.scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh && object.name === meshName) {
        object.visible = !object.visible;
        found = true;
      }
    });
    if (found) {
      setMeshes(prevMeshes => 
        prevMeshes.map(mesh => 
          mesh.name === meshName ? { ...mesh, visible: !mesh.visible } : mesh
        )
      );
    }
  };

  useEffect(() => {
    const vrm = vrmManager.currentVrm;
    setCurrentVrm(vrm);
    if (vrm) setMeshes(listVrmMeshes(vrm));
    else setMeshes([]);

    const handleVrmLoad = (event: CustomEvent) => {
        const newVrm = event.detail.vrm;
        setCurrentVrm(newVrm);
        setMeshes(listVrmMeshes(newVrm));
    };
    const handleVrmUnload = () => {
        setCurrentVrm(null);
        setMeshes([]);
    };

    const unsubLoad = window.electronAPI.on('vrm:loaded', handleVrmLoad);
    const unsubUnload = window.electronAPI.on('vrm:unloaded', handleVrmUnload);
    return () => {
      if (unsubLoad) unsubLoad();
      if (unsubUnload) unsubUnload();
    };
  }, [vrmManager, listVrmMeshes]);

  return (
    <div className={`panel-container ${isCollapsed ? 'collapsed' : ''}`} style={{ top: y, left: x }}>
      <div className="panel-header" ref={handleRef} style={{ cursor: 'move' }}>
        <h3 className="panel-title">메쉬 관리</h3>
        <div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="panel-close-button" style={{ right: '40px' }}>{isCollapsed ? '□' : '−'}</button>
          <button onClick={onClose} className="panel-close-button">×</button>
        </div>
      </div>
      <div className="panel-content">
        {meshes.length === 0 ? (
          <p className="empty-message">VRM 모델이 로드되지 않았거나 메쉬가 없습니다.</p>
        ) : (
          meshes.map((mesh) => (
            <div key={mesh.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #333' }}>
              <span style={{ flexGrow: 1, marginRight: '10px' }}>{mesh.name}</span>
              <button 
                onClick={() => toggleVrmMeshVisibility(mesh.name)}
                style={{
                  padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer',
                  backgroundColor: mesh.visible ? '#555' : '#007bff', color: 'white'
                }}
              >
                {mesh.visible ? '숨기기' : '보이기'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MeshControlPanel;
