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
      description: 'dataProviders.getMousePosition.description',
      params: [],
      outputs: [
        { name: 'x', type: 'number', description: 'dataProviders.getMousePosition.outputs.x' },
        { name: 'y', type: 'number', description: 'dataProviders.getMousePosition.outputs.y' },
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
      description: 'dataProviders.getCharacterState.description',
      params: [
        { 
          name: 'key', 
          type: 'enum', 
          options: ['characterName', 'userName', 'curiosity', 'happiness', 'energy', 'lastInteractionTimestamp'], 
          description: 'dataProviders.getCharacterState.params.key',
        },
      ],
      outputs: [
        { name: 'value', type: 'any', description: 'dataProviders.getCharacterState.outputs.value' },
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
      description: 'dataProviders.getContextValue.description',
      params: [{ name: 'key', type: 'string', description: 'dataProviders.getContextValue.params.key' }],
      outputs: [
        { name: 'value', type: 'any', description: 'dataProviders.getContextValue.outputs.value' },
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
      description: 'dataProviders.getCharacterScreenPosition.description',
      params: [], // 입력 파라미터 없음
      outputs: [
        { name: 'x', type: 'number', description: 'dataProviders.getCharacterScreenPosition.outputs.x' },
        { name: 'y', type: 'number', description: 'dataProviders.getCharacterScreenPosition.outputs.y' },
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
