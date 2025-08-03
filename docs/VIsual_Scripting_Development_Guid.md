# 시퀀스 에디터: 액션 및 노드 확장 가이드

이 문서는 시퀀스 에디터의 기능을 확장하려는 개발자를 위한 기술 가이드입니다. 새로운 액션을 추가하거나, 액션의 UI를 개선하는 방법을 설명합니다.

## 1. 새로운 액션 추가하기

새로운 액션을 추가하는 모든 작업은 `src/core/action-registrar.ts` 파일에서 이루어집니다. `actionRegistry.register()` 함수를 사용하여 액션의 **정의(메타데이터)**와 **구현(실제 함수)**을 한 번에 등록합니다.

### 가. 기본 구조

```typescript
// src/core/action-registrar.ts

registry.register(
  // 1. 액션의 정의 (메타데이터)
  {
    name: 'myNewAction',
    description: '새로운 액션에 대한 설명입니다.',
    params: [
      { name: 'message', type: 'string', description: '전달할 메시지' },
      { name: 'duration', type: 'number', defaultValue: 5, description: '지속 시간' },
    ],
  },
  // 2. 액션의 실제 구현 (함수)
  (message: string, duration: number) => {
    // 실제 실행될 로직
    console.log(message, duration);
  }
);
```

### 나. 값을 반환하는 액션 (`returnType`)

액션이 실행된 후 결과값을 다른 노드로 전달해야 할 경우, 정의 객체에 `returnType`을 추가합니다.

-   `returnType`이 정의되면, 시퀀스 에디터의 해당 액션 노드에 **출력 데이터 포트**가 자동으로 생성됩니다.
-   액션 함수의 `return` 값이 이 출력 포트를 통해 다른 노드로 전달됩니다.

```typescript
registry.register(
  {
    name: 'getContext',
    description: '전역 컨텍스트에서 값을 가져옵니다.',
    params: [{ name: 'key', type: 'string', description: '가져올 키' }],
    returnType: 'any', // 출력 포트의 타입을 'any'로 지정
  },
  async (key: string) => {
    const value = await window.electronAPI.invoke('context:get', key);
    return value; // 이 값이 'returnValue' 출력 포트로 전달됨
  }
);
```

## 2. 액션 파라미터 UI 개선 (`dynamicOptions`)

특정 파라미터(예: 애니메이션 이름)를 사용자가 직접 입력하는 대신, 시스템에 등록된 목록에서 선택하게 만들고 싶을 때 `dynamicOptions` 속성을 사용합니다.

### 구현 원리

1.  **액션 정의에 힌트 추가**: `action-registrar.ts`의 파라미터 정의에 `dynamicOptions: 'key'`를 추가합니다. 이 `key`는 UI가 어떤 종류의 데이터를 가져와야 하는지 알려주는 식별자입니다.
2.  **UI 컴포넌트에서 힌트 감지**: `ActionNode.tsx`의 `EmbeddedInput` 컴포넌트는 이 `key`를 감지하고, 일반 입력 필드 대신 특정 데이터를 조회하여 보여주는 드롭다운 컴포넌트(`DynamicSelectInput`)를 렌더링합니다.

### 구현 예시: `playAnimation` 액션

`playAnimation` 액션의 `animationName` 파라미터에 사용 가능한 애니메이션 파일 목록을 드롭다운으로 제공하는 과정입니다.

1.  **`action-registrar.ts` 수정**:
    `animationName` 파라미터에 `dynamicOptions: 'animations'`를 추가합니다.

    ```typescript
    // ...
    {
      name: 'animationName',
      type: 'string',
      description: '애니메이션 파일 이름',
      dynamicOptions: 'animations', // UI 힌트 추가
    },
    // ...
    ```

2.  **`ActionNode.tsx`의 `DynamicSelectInput` 컴포넌트**:
    *   이 컴포넌트는 `dynamicOptions` 값이 `'animations'`인 것을 확인하면, `window.electronAPI.listDirectory`를 호출하여 `userdata/animations`와 `assets/Animation` 폴더의 파일 목록을 가져옵니다.
    *   가져온 파일 목록을 드롭다운 메뉴에 표시합니다.

이 구조는 다른 액션(예: `setPose`)에도 쉽게 확장할 수 있습니다. 새로운 `key`를 정의하고, `DynamicSelectInput` 컴포넌트가 해당 `key`를 처리하도록 로직을 추가하기만 하면 됩니다.