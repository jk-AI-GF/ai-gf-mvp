import * as THREE from 'three';
import { DataProviderRegistry } from './data-provider-registry';
import { PluginContext } from '../../plugin-api/plugin-context';

export function registerCoreDataProviders(
  registry: DataProviderRegistry,
  context: PluginContext,
) {
  const { vrmManager } = context;
  if (!vrmManager) {
    console.error("Cannot register core data providers: VRMManager is missing from the context.");
    return;
  }

  registry.register(
    {
      name: 'getCharacterScreenPosition',
      description: '캐릭터의 현재 화면 좌표(0.0-1.0)를 가져옵니다.',
      params: [], // 입력 파라미터 없음
      outputs: [
        { name: 'x', type: 'number', description: '화면 X 좌표 (0.0-1.0)' },
        { name: 'y', type: 'number', description: '화면 Y 좌표 (0.0-1.0)' },
      ],
    },
    () => {
      if (!vrmManager.currentVrm || !vrmManager.activeCamera) {
        return { x: 0.5, y: 0.5 }; // VRM이 없으면 기본값 반환
      }

      const worldPosition = new THREE.Vector3();
      // 캐릭터 모델의 루트(scene)의 월드 좌표를 가져옵니다.
      vrmManager.currentVrm.scene.getWorldPosition(worldPosition);
      
      // 3D 월드 좌표를 카메라에 투영하여 NDC(-1 to 1) 좌표로 변환합니다.
      const screenPosition = worldPosition.clone().project(vrmManager.activeCamera);

      // NDC 좌표를 화면 비율(0.0 to 1.0)로 변환합니다.
      const x = (screenPosition.x + 1) / 2;
      const y = (-screenPosition.y + 1) / 2; // Y축은 위쪽이 0이므로 반전

      return { x, y };
    }
  );
}
