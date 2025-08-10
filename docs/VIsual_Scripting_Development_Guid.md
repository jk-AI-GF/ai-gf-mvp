# 시퀀스 에디터: 개발 및 확장 가이드

이 문서는 시퀀스 에디터의 기능을 확장하거나, 사용자가 새로운 상호작용을 만드는 방법을 설명하는 기술 및 사용자 가이드입니다.

## 1. 시퀀스와 서브루틴 만들기

시퀀스 에디터에서는 두 가지 종류의 콘텐츠, 즉 **시퀀스**와 **서브루틴**을 만들 수 있습니다. 어떤 것을 만들지는 사용자가 어떤 **시작 노드**를 그래프에 추가하는지에 따라 자동으로 결정됩니다.

-   **시퀀스 만들기**: 사이드바의 `Events` 목록에서 **`이벤트` 노드**를 끌어다 놓으면 '시퀀스'가 됩니다. 시퀀스는 특정 이벤트가 발생했을 때 자동으로 실행되는 로직입니다.
-   **서브루틴 만들기**: 사이드바의 `Starters` 목록에서 **`입력(Input)` 노드**를 끌어다 놓으면 '서브루틴'이 됩니다. 서브루틴은 다른 곳에서 호출하여 사용하는 재사용 가능한 함수입니다.

> **중요**: 하나의 그래프에는 한 종류의 시작 노드만 존재할 수 있습니다. `이벤트` 노드를 사용하면 `입력` 노드는 비활성화되며, 그 반대도 마찬가지입니다.

---

## 2. 서브루틴 완벽 가이드

서브루틴은 "입력값을 받아 정해진 동작을 수행하는 함수"와 같습니다. 이를 통해 반복적인 로직을 한 번만 만들어두고 여러 곳에서 재사용할 수 있습니다.

### 가. 서브루틴 만들기: `입력(Input)` 노드

1.  **`입력` 노드 추가**: 사이드바의 `Starters` > `Input` 노드를 에디터 캔버스로 드래그합니다.
2.  **파라미터 정의**:
    *   `입력` 노드를 선택하면 속성 패널(Inspector)에 파라미터 목록이 나타납니다.
    *   `Add Parameter` 버튼을 눌러 이 서브루틴이 받을 입력값(파라미터)을 추가합니다.
    *   각 파라미터에 대해 **이름(Name)**, **타입(Type)**, **설명(Description)**을 설정할 수 있습니다. 이 설명은 나중에 LLM이 이 서브루틴의 기능을 이해하는 데 사용되므로 명확하게 작성하는 것이 좋습니다.
3.  **로직 구현**:
    *   `입력` 노드의 출력 데이터 포트(방금 정의한 파라미터들)를 다른 노드들(액션, 제어 흐름 등)에 연결하여 원하는 로직을 구현합니다.
    *   예를 들어, `message`라는 문자열 파라미터를 `Play TTS` 액션 노드의 `message` 입력 포트에 연결하면, 서브루틴이 호출될 때 받은 `message`를 캐릭터가 말하게 됩니다.
4.  **저장**:
    *   서브루틴의 전체 기능에 대한 설명을 `Description` 필드에 작성합니다.
    *   `Save` 버튼을 눌러 서브루틴을 `.json` 파일로 저장합니다.

### 나. 서브루틴 사용하기: `서브루틴 호출(Call Subroutine)` 노드

1.  **`서브루틴 호출` 노드 추가**: 다른 시퀀스나 서브루틴을 만드는 중에, 사이드바의 `Actions` > `Control` > `Call Subroutine` 노드를 캔버스로 드래그합니다.
2.  **호출할 서브루틴 선택**:
    *   `서브루틴 호출` 노드를 선택하면 속성 패널에 드롭다운 메뉴가 나타납니다.
    *   이 드롭다운에서 내가 만든 서브루틴 목록을 볼 수 있습니다. 호출하고 싶은 서브루틴을 선택합니다.
3.  **입력 포트 자동 변경**:
    *   서브루틴을 선택하는 즉시, `서브루틴 호출` 노드의 **입력 데이터 포트가 선택한 서브루틴의 파라미터에 맞춰 동적으로 변경됩니다.**
    *   예를 들어, 호출할 서브루틴이 `message(string)`와 `duration(number)` 파라미터를 가지고 있다면, `서브루틴 호출` 노드에도 똑같은 이름과 타입의 입력 포트가 생성됩니다.
4.  **파라미터 값 연결**:
    *   생성된 입력 포트에 다른 노드의 출력값을 연결하거나, `리터럴` 노드를 사용해 고정된 값을 전달하여 서브루틴에 필요한 데이터를 넘겨줍니다.

---

## 3. 개발자: 새로운 액션 추가하기

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

## 4. 개발자: 액션 파라미터 UI 개선 (`dynamicOptions`)

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

이 구조는 다른 액션(예: `setPose`, `runSubroutine`)에도 쉽게 확장할 수 있습니다. 새로운 `key`를 정의하고, `DynamicSelectInput` 컴포넌트가 해당 `key`를 처리하도록 로직을 추가하기만 하면 됩니다.
