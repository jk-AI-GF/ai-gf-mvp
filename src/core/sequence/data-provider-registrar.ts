import * as THREE from 'three';
import { DataProviderRegistry } from './data-provider-registry';
import { ICharacterState, PluginContext } from '../../plugin-api/plugin-context';

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
      name: 'getMousePosition',
      description: '현재 마우스 커서의 화면 좌표(px)를 가져옵니다.',
      params: [],
      outputs: [
        { name: 'x', type: 'number', description: '화면 X 좌표 (px)' },
        { name: 'y', type: 'number', description: '화면 Y 좌표 (px)' },
      ],
    },
    () => {
      const mousePosition = context.contextStore.get('mousePosition') as { x: number; y: number; } | undefined;
      // Fallback to 0,0 if the value isn't set yet
      const x = mousePosition?.x ?? 0;
      const y = mousePosition?.y ?? 0;
      return { x, y };
    }
  );

  registry.register(
    {
      name: 'getCharacterState',
      description: '캐릭터의 현재 내부 상태 값을 가져옵니다.',
      params: [
        { 
          name: 'key', 
          type: 'enum', 
          options: ['characterName', 'userName', 'curiosity', 'happiness', 'energy', 'lastInteractionTimestamp'], 
          description: '가져올 상태',
        },
      ],
      outputs: [
        { name: 'value', type: 'any', description: '상태 값' },
      ],
    },
    (params: { key: keyof Omit<ICharacterState, 'toJSON' | 'hydrate' | 'initialize'> }) => {
      const { characterState } = context;
      if (!params || !params.key) return { value: null };
      return { value: characterState[params.key] };
    }
  );

  registry.register(
    {
      name: 'getContextValue',
      description: '전역 컨텍스트(ContextStore)에서 값을 가져옵니다.',
      params: [{ name: 'key', type: 'string', description: '가져올 키' }],
      outputs: [
        { name: 'value', type: 'any', description: '컨텍스트 값' },
      ],
    },
    async (params: { key: string }) => {
      if (!params || !params.key) return { value: null };
      const value = await window.electronAPI.invoke('context:get', params.key);
      return { value };
    }
  );

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
