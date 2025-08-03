# 아키텍처 개요: 주요 파일 및 디렉토리 역할

이 문서는 AI-GF MVP 프로젝트의 코드베이스를 구성하는 주요 파일과 디렉토리의 역할과 책임을 설명합니다. 새로운 개발자가 코드의 구조를 이해하고 어디를 수정해야 할지 찾는 데 도움을 주는 것을 목표로 합니다.

## 📁 최상위 디렉토리

-   **`docs/`**: 프로젝트의 모든 문서를 포함합니다. 개발 가이드, API 레퍼런스, 아키텍처 문서 등이 위치합니다.
-   **`src/`**: 애플리케이션의 모든 소스 코드가 있는 곳입니다.
-   **`userdata/`**: 사용자가 직접 생성하거나 수정하는 데이터가 저장되는 공간입니다.
    -   **`mods/`**: 사용자가 직접 만든 모드(플러그인)를 넣는 디렉토리입니다.

## 📂 `src` 디렉토리 상세

### `src/main/` - Electron 메인 프로세스

-   **`index.ts`**: Electron 애플리케케이션의 메인 진입점입니다. 브라우저 윈도우를 생성하고, 시스템 레벨의 이벤트(예: 앱 종료, 단축키)를 처리하며, 렌더러 프로세스와의 통신을 위한 IPC 핸들러를 설정합니다.
    -   **주요 로직**:
        -   `alwaysOnTop` 및 투명 창 관리.
        -   파일 다이얼로그 실행 시 `alwaysOnTop` 속성 임시 비활성화 및 재활성화 로직.
        -   '마우스 무시' 모드 토글 로직 및 IPC 핸들러.
    -   **액션 프록시 IPC**: 렌더러 프로세스로부터 `set-action-definitions` 채널을 통해 액션 명세를 수신하고, 모드(Mod)가 `proxy-action` 채널을 통해 렌더러의 액션을 실행할 수 있도록 중계합니다.

-   **`preload.ts`**: 메인 프로세스와 렌더러 프로세스 사이의 안전한 통신을 위한 브릿지 역할을 합니다. `contextBridge`를 사용하여 `window.electronAPI` 객체를 렌더러에 노출시킵니다.

### `src/renderer/` - 프론트엔드 (렌더러 프로세스)

이 디렉토리는 사용자에게 보여지는 모든 것을 담당하며, **모든 액션(Action)의 실제 구현부가 존재하는 "Source of Truth" 역할을 합니다.**

-   **`renderer.tsx`**: React 애플리케이션의 진입점입니다. `AppContextProvider`와 `App` 컴포넌트를 실제 DOM에 렌더링합니다.

-   **`App.tsx`**: 모든 2D UI 컴포넌트(패널, 메뉴, 버튼 등)를 포함하고 배치하는 최상위 React 컴포넌트입니다.
    -   **주요 역할**:
        -   `ActionRegistry` 인스턴스를 생성하고, `action-registrar`를 통해 모든 코어 액션을 등록합니다.
        -   생성된 `ActionRegistry`를 `AppContext`를 통해 하위 컴포넌트에 제공합니다.
        -   렌더러 준비가 완료되면, 등록된 액션 명세를 `set-action-definitions` IPC 채널을 통해 메인 프로세스로 전송합니다.
        -   **모든 시퀀스 관련 UI 이벤트(활성화, 삭제, 수동 실행 등)를 `SequenceManager`로 전달하는 역할을 합니다.**

-   **`contexts/AppContext.tsx`**: **애플리케이션의 심장부**입니다. `vrmManager`, `pluginManager`, `actionRegistry`, **`sequenceManager`** 등 애플리케이션의 핵심 관리자 인스턴스를 생성하고, React Context API를 통해 모든 하위 컴포넌트에 이들을 제공합니다.

-   **`vrm-manager.ts`**: VRM 모델에 대한 저수준(low-level) 제어를 직접 담당하는 클래스입니다. VRM 파일 로딩, 애니메이션 재생, 표정 변화, 포즈 적용 등의 실제 로직이 여기에 구현되어 있습니다.

-   **`components/SequenceEditor/`**: **비주얼 스크립팅 "시퀀스" 시스템의 UI(View)**를 담당하는 컴포넌트들이 위치합니다. 이 컴포넌트들은 `core/sequence`에 정의된 모델의 데이터를 받아 화면에 렌더링하는 역할에 집중합니다.
    -   **`SequenceEditor.tsx`**: `React Flow`를 기반으로 한 에디터의 메인 컨테이너입니다. 노드, 엣지(연결선)의 상태를 관리하고, 커스텀 노드 컴포넌트를 `React Flow`에 등록합니다.
    -   **`ActionNode.tsx`, `ManualStartNode.tsx`**: 각 노드 모델을 시각적으로 표현하는 커스텀 노드 컴포넌트입니다. 모델의 포트 정보를 바탕으로 연결 핸들을 동적으로 생성하고, 내장 파라미터를 편집할 수 있는 UI를 제공합니다.
    -   **`Sidebar.tsx`**: 에디터 좌측에 위치하며, 사용자가 새로운 노드를 캔버스로 드래그 앤 드롭할 수 있도록 노드 목록을 제공합니다.

### `src/plugin-api/` 및 `src/plugins/` - 플러그인 아키텍처

-   **`plugin-api/`**: **모더와 코어 개발자를 위한 "공식 API"**가 정의된 디렉토리입니다. 플러그인이 시스템과 상호작용하기 위해 필요한 모든 인터페이스(`PluginContext`, `IPlugin` 등)가 이곳에 정의됩니다.
    -   **`actions.ts`**: `ActionDefinition`, `ActionParam` 등 액션의 구조를 정의하는 핵심 인터페이스가 위치합니다.
    -   **`context-factory.ts`**: **`PluginContext` 생성의 유일한 책임자**입니다. `vrmManager`, `actionRegistry` 등 핵심 모듈을 인자로 받아, `ActionRegistry`에 등록된 정보를 기반으로 동적으로 `Actions`와 `SystemControls`의 실제 구현을 포함하는 완전한 `PluginContext` 객체를 생성하여 반환합니다.

-   **`plugins/`**: 애플리케이션의 기본 행동(자동 눈 깜빡임, 자동 고개 돌리기 등)을 제공하는 **코어 플러그인**들이 위치합니다. 이 플러그인들은 사용자가 만드는 모드와 동일한 `IPlugin` 인터페이스와 `PluginContext`를 사용하여 만들어집니다.

-   **`plugin-manager.ts`**: **모든 플러그인의 생명주기(Lifecycle)를 총괄하는 핵심 관리자**입니다.
    -   **주요 역할**:
        1.  플러그인을 등록(`register`)하고 `PluginContext`를 주입합니다.
        2.  플러그인의 `setup`, `onEnable`, `onDisable` 생명주기 메서드를 적절한 시점에 호출합니다.
        3.  '편집 모드' 상태가 변경되면(`setEditMode` 호출), `runInEditMode` 속성이 `false`인 플러그인들을 자동으로 비활성화/활성화하여 동작을 제어합니다.
        4.  활성화된 플러그인들의 `update` 메서드를 매 프레임 호출합니다.

### `src/core/` - 핵심 유틸리티 및 엔진

-   **`action-registry.ts`**: **`ActionRegistry` 클래스의 정의**가 위치합니다. 이 클래스는 액션의 메타데이터와 구현을 함께 저장하는 중앙 저장소 역할을 합니다.

-   **`action-registrar.ts`**: **모든 코어 액션이 등록되는 곳**입니다. `App.tsx`에서 생성된 `ActionRegistry` 인스턴스를 받아, `register` 메소드를 통해 모든 내장 액션의 정의와 구현을 등록합니다. **새로운 코어 액션을 추가할 때 유일하게 수정해야 하는 파일입니다.**

-   **`mod-loader.ts`**: `userdata/mods` 폴더에서 사용자 모드를 찾아 읽고, 유효성을 검사하여 실행하는 역할을 담당합니다. **메인 프로세스에서 동작하는 모드를 위해, 렌더러로부터 수신한 액션 명세를 기반으로 IPC 프록시 `PluginContext`를 동적으로 구성합니다.**

-   **`event-bus.ts`**: 애플리케이션 전역에서 사용되는 발행/구독(Pub/Sub) 이벤트 버스입니다. 모듈 간의 결합도를 낮추는 핵심적인 역할을 합니다. `AppEvents` 인터페이스에 시스템의 모든 이벤트 타입이 정적으로 정의됩니다.

-   **`event-definitions.ts`**: `AppEvents`에 정의된 이벤트 중, 시퀀스 에디터나 레거시 트리거 UI에 노출될 이벤트들의 상세 메타데이터(설명, 데이터 구조 등)를 정의합니다. `payloadSchema`를 통해 각 이벤트가 전달하는 데이터의 타입과 키를 명시하여, `EventNode`가 타입에 맞는 출력 포트를 생성하는 데 사용됩니다.

-   **`sequence/`**: **비주얼 스크립팅 "시퀀스"의 핵심 로직(Model)과 실행 엔진**이 위치합니다.
    -   **`SequenceManager.ts`**: **시퀀스의 전체 생명주기를 관리하는 중앙 관리자**입니다. 파일 I/O, (역)직렬화, 상태(활성화/비활성화) 관리, 실행 요청 중계 등 모든 시퀀스 관련 작업을 총괄합니다. `App.tsx`의 복잡성을 줄이고 역할을 분리하기 위해 도입되었습니다.
    -   **`SequenceEngine.ts`**: `SequenceManager`의 요청을 받아 실제 시퀀스 그래프의 실행을 담당하는 엔진입니다. `EventNode`를 감지하여 `eventBus` 리스너를 동적으로 구독/해제하고, 노드 체인을 따라 실행을 전파하는 역할에 집중합니다.
    -   **`BaseNode.ts`**: 모든 시퀀스 노드의 공통 로직과 규약을 정의하는 추상 클래스입니다.
    -   **`ActionNodeModel.ts`, `ManualStartNodeModel.ts`, `EventNodeModel.ts`**: `BaseNode`를 상속받아 각 노드 타입의 고유한 상태와 실행 로직을 구현하는 모델 클래스입니다.

-   **`trigger-engine.ts`**: `registerTrigger`를 통해 등록된 모든 트리거의 조건을 주기적으로 검사하고, 조건이 충족되면 해당 액션을 실행하는 엔진입니다.

-   **`custom-trigger-manager.ts`**: **사용자 정의 트리거의 생명주기를 관리**하는 핵심 모듈입니다. `electron-store`에서 사용자가 UI를 통해 생성한 트리거(JSON 데이터)를 불러와, 실행 가능한 로직(이벤트 리스너)으로 변환하고 `EventBus`에 등록하는 역할을 합니다. 또한 UI로부터 트리거의 동적 추가/삭제 요청을 받아 시스템에 즉시 반영합니다.
