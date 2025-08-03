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

