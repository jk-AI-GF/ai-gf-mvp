1단계: 기초 인프라
(1) 시퀀스 데이터 구조
Sequence, Event, Action, Trigger 클래스를 정의

JSON 직렬화/역직렬화 가능하게 만들기

해야 할 일

Sequence = 이벤트/액션/트리거 전체를 포함

Electron store → Sequence JSON 저장/로드

(2) 실행 엔진
런타임에서 이벤트 → 액션 실행이 동작하도록 만든다.

아직 UI는 필요 없음 (코드로 테스트)

해야 할 일

이벤트 등록/해제

액션 실행 함수

Delay/Sequence 액션 지원 (간단한 타이머)

2단계: 기본 UI (Node Graph 없이)
(3) 시퀀스 관리 UI (리스트 기반)
이벤트/액션 한 쌍을 추가/삭제할 수 있는 간단한 리스트 UI

Node Graph 이전에 기능을 먼저 보장

해야 할 일

Electron React 패널에 Sequence 리스트 표시

시퀀스 선택/실행/저장

3단계: Node Graph Editor (react-flow)
(4) Node Graph MVP
react-flow를 도입해서 Event 노드 – Action 노드 연결 가능하게

저장/불러오기 → Sequence JSON과 동기화

해야 할 일

Event 노드: 타입 선택

Action 노드: 타입 + 파라미터 UI

Edge = Trigger

UI 상에서 연결 → Sequence JSON으로 변환

4단계: Action Set 지원
(5) Action Set 시스템
여러 Action을 묶어서 하나의 Action Set 객체로 관리

Action Set은 Node Graph 안에서는 하나의 Action 노드처럼 동작

Quick Action 버튼에서도 호출 가능하게

해야 할 일

Action Set = [ {action}, {wait}, {action} ]

Node Graph 노드 타입 추가

Quick Action UI에 등록/호출 기능 추가

5단계: 오브젝트/엔티티 시스템
(6) 엔티티 클래스 도입
Entity (캐릭터/오브젝트 공통)

Transform (위치, 회전, 스케일)

Mesh (3D or 2D)

SequenceManager (로컬 시퀀스)

해야 할 일

모든 캐릭터와 오브젝트를 Entity 기반으로 통합

Entity별 Sequence 실행 가능하게

(7) 오브젝트 에셋 로드
glTF/GLB (3D), PNG/WebP (2D)** 로드 기능

드래그 앤 드롭 → 씬에 배치

위치/스케일 저장

6단계: 오브젝트 시퀀스 연동
(8) 오브젝트 이벤트 지원
오브젝트 클릭/마우스 오버 이벤트 발생 → 해당 오브젝트의 로컬 시퀀스 실행

Node Graph에서 글로벌 그래프 / 로컬 그래프 전환 가능하게

7단계: 추가 노드/고급화
(9) 중간 노드 추가
Delay, Random, Condition, Variable 노드

Action Set 안에서도 사용 가능하게 (Nested Graph)

8단계: 공유 시스템
(10) 시퀀스/Action Set/오브젝트 Export/Import
JSON 파일 단위로 내보내기/불러오기

다른 유저와 공유할 수 있는 생태계 기반

순서 요약
데이터 구조 (Sequence, Action, Event)

런타임 실행 엔진 (코드 기반)

간단한 리스트 UI

Node Graph Editor (react-flow)

Action Set 객체 도입

Entity 시스템 (캐릭터/오브젝트 통합)

외부 3D/2D 에셋 로드

오브젝트 로컬 시퀀스 연동

중간 노드(조건/랜덤/Delay)

공유 기능

이 로드맵의 장점
초반에 실행 로직을 완성하고,

UI는 나중에 붙이기 때문에,

“돌아가는 뼈대”가 빨리 생김.

Node Graph나 오브젝트 시스템은 점진적으로 붙여도 됨.

---

## 동적 파라미터 UI 구현 (`dynamicOptions`)

시퀀스 에디터의 사용성을 높이기 위해, 특정 액션 파라미터의 값을 사용자가 직접 입력하는 대신 시스템에 등록된 목록(예: 애니메이션, 포즈)에서 선택하게 할 수 있습니다. 이를 위해 `dynamicOptions` 속성을 사용합니다.

### 구현 원리

1.  **액션 정의에 힌트 추가**: `src/core/action-registrar.ts`의 액션 정의에서, 동적 목록이 필요한 파라미터에 `dynamicOptions: 'key'`를 추가합니다. 이 `key`는 UI가 어떤 종류의 데이터를 가져와야 하는지 알려주는 식별자입니다.

2.  **UI 컴포넌트에서 힌트 감지**: `ActionNode.tsx`와 같은 UI 컴포넌트는 노드를 렌더링할 때 파라미터에 `dynamicOptions` 속성이 있는지 확인합니다.

3.  **데이터 로딩 및 드롭다운 렌더링**:
    *   속성이 감지되면, 일반 입력 필드 대신 드롭다운(`<select>`) 컴포넌트를 렌더링합니다.
    *   `dynamicOptions`의 `key` 값(예: 'animations')에 따라 `window.electronAPI`의 적절한 함수를 호출하여 데이터 목록을 비동기적으로 가져옵니다.
    *   가져온 목록을 드롭다운의 옵션으로 채웁니다.

### 구현 예시: `playAnimation` 액션

`playAnimation` 액션의 `animationName` 파라미터에 사용 가능한 애니메이션 파일 목록을 드롭다운으로 제공하는 과정입니다.

1.  **`action-registrar.ts` 수정**:
    `playAnimation` 액션의 `animationName` 파라미터에 `dynamicOptions: 'animations'`를 추가합니다.

    ```typescript
    // ...
    {
      name: 'animationName',
      type: 'string',
      description: '애니메이션 파일 이름',
      dynamicOptions: 'animations', // UI 힌트 추가
      validation: (value: any) => (typeof value === 'string' && value.trim() !== '') || '애니메이션 이름은 필수입니다.'
    },
    // ...
    ```

2.  **`ActionNode.tsx` 수정**:
    *   `EmbeddedInput` 컴포넌트 내에서 `param.dynamicOptions === 'animations'`인지 확인합니다.
    *   true일 경우, `window.electronAPI.listDirectory`를 호출하여 `userdata/animations`와 `assets/Animation` 폴더의 파일 목록을 가져오는 `DynamicSelectInput`과 같은 별도의 컴포넌트를 렌더링합니다.
    *   가져온 파일 목록(.vrma, .fbx)을 드롭다운 메뉴에 표시합니다.

### 확장성: `setPose` 액션에 적용하기

이 구조는 다른 액션에도 쉽게 확장할 수 있습니다. 예를 들어, `setPose` 액션의 `poseName` 파라미터에 사용 가능한 포즈 목록을 제공하고 싶다면 다음과 같이 진행할 수 있습니다.

1.  **액션 정의 수정**: `action-registrar.ts`에서 `setPose` 액션의 `poseName` 파라미터에 `dynamicOptions: 'poses'` 힌트를 추가합니다.
2.  **UI 컴포넌트 확장**: `ActionNode.tsx`의 `DynamicSelectInput` 컴포넌트(또는 유사한 컴포넌트)가 `'poses'` 키를 인식하도록 확장합니다. `'poses'` 키가 감지되면 `userdata/poses` 폴더에서 `.vrma` 파일을 가져오도록 로직을 추가하면 됩니다.

이처럼 `dynamicOptions`는 중앙화된 로직을 통해 다양한 파라미터에 동적 드롭다운 UI를 간결하고 확장 가능하게 구현하는 방법을 제공합니다.

---

## 데이터 흐름(Data Flow) 구현

단순히 실행 순서만 연결하는 것을 넘어, 한 노드의 실행 결과를 다른 노드의 입력으로 사용하는 데이터 흐름 기능을 구현하여 시퀀스의 표현력을 극대화합니다. 예를 들어, `getContext` 액션으로 가져온 값을 `showMessage` 액션의 메시지로 전달할 수 있습니다.

### 구현 원리

1.  **액션 반환 값 정의 (`returnType`)**:
    *   `src/plugin-api/actions.ts`의 `ActionDefinition` 인터페이스에 `returnType?: 'string' | 'number' | 'boolean' | 'any'` 필드를 추가합니다.
    *   `action-registrar.ts`에서 값을 반환하는 액션(예: `getContext`)을 등록할 때, 이 `returnType`을 명시해줍니다.
    *   `ActionNodeModel`은 이 `returnType`을 보고, 노드에 `returnValue`라는 이름의 출력 데이터 포트(Output Data Port)를 동적으로 생성합니다.

2.  **실행 엔진(SequenceEngine) v2**:
    *   **ExecutionContext**: 시퀀스가 한 번 실행되는 동안, 모든 노드의 출력값을 저장하는 `ExecutionContext` 클래스를 도입합니다. 이 컨텍스트는 `Map`을 사용하여 `"{nodeId}-{outputHandleName}"` 형태의 키로 각 포트의 출력값을 관리합니다.
    *   **데이터 중심 실행**: `SequenceEngine`의 실행 로직을 재귀 방식에서 큐(Queue) 기반의 `while` 루프로 변경합니다.
        1.  **입력 계산**: 노드를 실행하기 직전, 해당 노드의 모든 입력 데이터 포트에 연결된 엣지를 찾습니다.
        2.  **값 조회**: `ExecutionContext`에서 엣지 출발점의 출력값을 조회합니다.
        3.  **입력 전달**: 조회한 값들을 모아 현재 노드의 `execute` 메소드에 `inputs` 인자로 전달합니다.
        4.  **출력 저장**: 노드 실행이 끝나면, `execute`가 반환한 `outputs` 객체(`{ returnValue: ... }`)를 `ExecutionContext`에 기록하여 다음 노드가 사용할 수 있도록 합니다.

### 구현 예시: `getContext`의 결과를 `showMessage`로 전달하기

1.  **`action-registrar.ts` 수정**:
    `getContext` 액션 정의에 `returnType: 'any'`를 추가합니다.

    ```typescript
    // ...
    {
      name: 'getContext',
      description: '전역 컨텍스트에서 값을 가져옵니다.',
      params: [{ name: 'key', type: 'string', description: '가져올 키' }],
      returnType: 'any', // 반환 값 타입 명시
    },
    // ...
    ```

2.  **`ActionNodeModel.ts` 수정**:
    *   생성자에서 `actionDefinition.returnType`이 있으면, `outputs` 배열에 `returnValue` 데이터 포트를 추가합니다.
    *   `execute` 메소드에서, 실제 액션 함수(`context.actions[...]`)를 실행한 후 반환된 값을 `{ returnValue: actionResult }` 형태로 `outputs` 객체에 담아 반환합니다.

3.  **시퀀스 에디터에서 연결**:
    *   이제 시퀀스 에디터에서 `getContext` 노드를 보면 `returnValue`라는 출력 포트가 생긴 것을 확인할 수 있습니다.
    *   이 `returnValue` 포트와 `showMessage` 노드의 `message` 입력 포트를 엣지로 연결합니다.

4.  **실행**:
    *   시퀀스가 실행되면, `SequenceEngine`은 `getContext`의 결과를 `ExecutionContext`에 저장합니다.
    *   그 다음 `showMessage` 노드를 실행할 때, `message` 입력에 `getContext`의 결과가 연결된 것을 확인하고, `ExecutionContext`에서 해당 값을 가져와 `showMessage`의 입력으로 전달합니다. 결과적으로 `getContext`가 가져온 값이 화면에 메시지로 표시됩니다.

### 핵심 제어 및 데이터 노드

데이터 흐름 시스템을 기반으로, 다양한 제어 및 데이터 노드를 구현하여 복잡한 로직을 구성할 수 있습니다.

*   **`Literal` (데이터 노드)**
    *   **기능**: `string`, `number`, `boolean` 타입의 상수 값을 직접 입력하여 데이터 흐름에 제공합니다.
    *   **주요 포트**: `returnValue` (출력)
    *   **사용 예**: `showMessage` 노드의 `message` 포트에 특정 문자열을 연결하거나, `Delay` 노드의 `delay` 포트에 숫자 값을 연결하는 등, 고정된 값을 제공할 때 사용합니다.

*   **`Delay` (제어 노드)**
    *   **기능**: 실행 흐름을 지정된 시간(초)만큼 지연시킵니다.
    *   **주요 포트**: `exec-in` (입력), `delay` (입력, number), `exec-out` (출력)
    *   **사용 예**: 애니메이션 재생 후 3초 기다렸다가 다음 행동을 하도록 할 때 사용합니다. `delay` 포트에 `Literal` 노드를 연결하여 지연 시간을 동적으로 제어할 수 있습니다.

*   **`Branch (If)` (제어 노드)**
    *   **기능**: 입력된 `boolean` 값에 따라 실행 흐름을 `True` 또는 `False` 경로로 분기시킵니다.
    *   **주요 포트**: `exec-in` (입력), `condition` (입력, boolean), `exec-true` (출력), `exec-false` (출력)
    *   **사용 예**: 특정 조건(예: `getContext`로 가져온 값이 특정 상태인지 확인)에 따라 다른 애니메이션이나 메시지를 표시하고 싶을 때 사용합니다.

