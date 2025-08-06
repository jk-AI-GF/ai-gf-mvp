# AI-GF 개발자 쿡북 (Developer's Cookbook)

이 문서는 AI-GF 프로젝트의 개발자가 새로운 기능을 추가하거나 기존 시스템을 수정하기 위해 알아야 할 실용적인 절차와 가이드를 제공합니다. "무엇"을 하는지가 아닌, **"어떻게"** 하는지에 초점을 맞춥니다.

---

## 1. 액션 (Action) 시스템

액션은 캐릭터나 시스템을 제어하는 모든 명령의 표준화된 게이트웨이입니다.

### 새로운 코어 액션 추가 워크플로우

새로운 코어 액션을 추가하는 과정은 항상 아래의 3개 파일을 순서대로 수정하는 작업을 포함합니다.

1.  **API 인터페이스에 타입 정의 (`src/plugin-api/actions.ts`)**
    *   **목적**: 플러그인과 모드에서 타입스크립트 자동 완성을 제공하기 위함입니다.
    *   **수행 작업**: `Actions` 인터페이스에 새로운 함수의 타입 시그니처를 추가합니다.

2.  **액션 구현체 등록 (`src/core/action-registrar.ts`)**
    *   **목적**: 액션의 메타데이터(이름, 설명, 파라미터)와 실제 로직을 시스템에 등록합니다. 이 파일은 모든 코어 액션이 등록되는 유일한 장소입니다.
    *   **수행 작업**: `registerCoreActions` 함수 내부에 `registry.register()` 호출을 추가합니다. 실제 로직은 다른 관리자(Manager) 클래스의 메소드를 호출하는 방식으로 구현해야 합니다.

3.  **컨텍스트 팩토리에 액션 연결 (`src/plugin-api/context-factory.ts`)**
    *   **목적**: `PluginContext`가 생성될 때, 1단계에서 정의한 인터페이스와 2단계에서 등록한 구현체를 연결하여 실제 호출 가능한 함수로 만듭니다.
    *   **수행 작업**: `createPluginContext` 함수 내부의 `actions` 객체에, `actionRegistry`에서 해당 액션을 찾아 실행하는 새로운 메소드를 추가합니다.

---

## 2. 이벤트 버스 (Event Bus)

이벤트 버스는 시스템의 여러 부분이 서로 직접적인 의존성 없이 통신할 수 있도록 하는 발행/구독(Pub/Sub) 시스템입니다.

### 새로운 전역 이벤트 추가 워크플로우

1.  **이벤트 타입 정의 (`src/core/event-bus.ts`)**
    *   **목적**: 애플리케이션 전역에서 사용될 이벤트의 이름과 해당 이벤트가 전달할 데이터(payload)의 타입을 정의합니다.
    *   **수행 작업**: `AppEvents` 타입 정의에 새로운 이벤트 키와 값의 타입을 추가합니다. 페이로드가 없는 이벤트는 `void`로 지정합니다.

2.  **이벤트 발행 (Emit)**
    *   **목적**: 시스템의 특정 지점에서 이벤트를 발생시킵니다.
    *   **수행 작업**: `pluginContext.eventBus.emit('eventName', payload)`를 호출합니다. `pluginContext`는 플러그인이나 `AppContext`를 통해 접근할 수 있습니다.

3.  **이벤트 구독 (Subscribe)**
    *   **목적**: 발생한 이벤트를 수신하여 특정 로직을 처리합니다.
    *   **수행 작업**: `pluginContext.eventBus.on('eventName', (payload) => { ... })`를 호출하여 리스너를 등록합니다. 컴포넌트나 플러그인이 비활성화될 때 `off()`를 호출하여 리스너를 정리하는 것이 중요합니다.

---

## 3. 시퀀스 (Sequence) 시스템

시퀀스는 사용자가 노드 기반의 비주얼 스크립팅을 통해 복잡한 상호작용을 만들 수 있게 하는 핵심 기능입니다.

### 새로운 시퀀스 노드 추가 워크플로우

새로운 노드를 추가하는 과정은 주로 `src/core/sequence/` 디렉토리 내에서 이루어집니다.

1.  **노드 모델 클래스 정의 (`src/core/sequence/`)**
    *   **목적**: 새로운 노드의 로직과 속성을 정의합니다.
    *   **수행 작업**: `src/core/sequence/` 디렉토리에 `[MyNodeName]NodeModel.ts` 파일을 생성합니다. 이 클래스는 `BaseNode`를 상속받아야 하며, `nodeDefinition` (노드의 이름, 설명, 포트 정보)과 `execute` (실제 실행 로직) 메소드를 구현해야 합니다.

2.  **노드 UI 컴포넌트 생성 (`src/renderer/components/SequenceEditor/nodes/`)**
    *   **목적**: 시퀀스 에디터에 표시될 노드의 시각적 형태를 정의합니다.
    *   **수행 작업**: `src/renderer/components/SequenceEditor/nodes/` 디렉토리에 `[MyNodeName]Node.tsx` 파일을 생성합니다. 이 컴포넌트는 노드의 제목, 포트, 내부 UI(입력 필드 등)를 렌더링합니다.

3.  **노드 등록 (`src/renderer/components/SequenceEditor/SequenceEditor.tsx`)**
    *   **목적**: 시퀀스 에디터가 새로운 노드 모델과 UI 컴포넌트를 인식하도록 등록합니다.
    *   **수행 작업**: `SequenceEditor.tsx` 파일 상단의 `nodeTypes`와 `nodeModelMap` 객체에 새로 만든 노드 UI 컴포넌트와 모델 클래스를 각각 추가합니다.

---

## 4. 상태 관리 (State Management)

플러그인과 모듈 간의 상태 공유를 위한 두 가지 주요 인-메모리(In-Memory) 메커니즘이 있습니다.

### `ContextStore`: 플러그인 간의 범용 상태 공유

`ContextStore`는 플러그인과 모듈이 서로 통신하기 위해 사용하는 간단한 전역 키-값 저장소입니다.

*   **상태 설정**: `pluginContext.set('myKey', myValue)`
*   **상태 조회**: `const myValue = pluginContext.get('myKey')`
*   **주요 파일**:
    *   `src/core/context-store.ts`: `ContextStore` 클래스의 정의.
    *   `src/plugin-api/plugin-context.ts`: `get`, `set` 메소드가 `PluginContext` 인터페이스에 정의되어 있습니다.

### `CharacterState`: 캐릭터의 핵심 상태 관리

`CharacterState`는 캐릭터의 핵심적인 내부 상태(예: 감정, 호기심)를 중앙에서 관리하는 객체입니다.

*   **상태 접근**: `pluginContext.characterState.curiosity` 와 같이 `PluginContext`를 통해 직접 접근하여 값을 읽거나 수정합니다.
*   **주요 파일**:
    *   `src/core/character-state.ts`: `characterState` 객체의 실제 구현과 타입 정의가 포함되어 있습니다.
    *   `src/plugin-api/plugin-context.ts`: `characterState`가 `PluginContext` 인터페이스에 포함되어 플러그인에 노출됩니다.

---

## 5. 모드 로딩 (Mod Loading)

사용자가 직접 추가한 모드(플러그인)는 애플리케이션 시작 시 특정 디렉토리에서 동적으로 로드됩니다.

### 모드 로딩 워크플로우

1.  **모드 파일 위치 (`userdata/mods/`)**
    *   **목적**: 사용자는 이 디렉토리에 자신의 모드 파일을 위치시킵니다. 각 모드는 자체 하위 디렉토리를 가지며, 진입점 파일(예: `index.js`)을 포함해야 합니다.

2.  **모드 로더 (`src/core/mod-loader.ts`)**
    *   **목적**: `userdata/mods` 디렉토리를 스캔하여 유효한 모드를 찾고 로드합니다.
    *   **동작 방식**: 메인 프로세스에서 실행되며, 각 모드에 대해 IPC 프록시 `PluginContext`를 생성하여 렌더러 프로세스의 기능에 안전하게 접근할 수 있도록 합니다.

3.  **플러그인 관리자 (`src/plugins/plugin-manager.ts`)**
    *   **목적**: `ModLoader`가 로드한 모드를 포함하여 모든 플러그인(코어, 모드)의 생명주기(`setup`, `onEnable`, `onDisable`, `update`)를 관리합니다.
    *   **동작 방식**: 렌더러 프로세스에서 실행되며, 로드된 모든 플러그인을 중앙에서 관리하고 적절한 시점에 생명주기 메소드를 호출합니다.

---

## 6. IPC 통신 (Main-Renderer 연동)

메인 프로세스(Node.js)의 기능을 렌더러 프로세스(UI)에서 안전하게 사용하기 위해 Electron의 `contextBridge`를 통한 명시적인 IPC(Inter-Process Communication) 채널을 사용합니다.

### 새로운 IPC 채널 추가 워크플로우

1.  **Preload 스크립트에 API 정의 (`src/main/preload.ts`)**
    *   **목적**: 렌더러 프로세스에 노출할 API 함수를 정의하고 `window.electronAPI` 객체에 추가합니다.
    *   **수행 작업**: `contextBridge.exposeInMainWorld('electronAPI', { ... })` 객체 내부에 새로운 함수를 추가합니다. 이 함수는 `ipcRenderer.invoke`를 사용하여 메인 프로세스로 메시지를 보냅니다.

2.  **메인 프로세스에 핸들러 등록 (`src/main/index.ts`)**
    *   **목적**: Preload 스크립트에서 보낸 메시지를 수신하고, 실제 Node.js 기능을 실행할 핸들러를 등록합니다.
    *   **수행 작업**: `app.whenReady().then(() => { ... })` 블록 내부에 `ipcMain.handle('channel-name', (event, ...args) => { ... })`을 사용하여 리스너를 추가합니다. 여기서 'channel-name'은 1단계에서 `invoke`에 사용한 채널 이름과 반드시 일치해야 합니다.

3.  **렌더러 프로세스에서 API 호출**
    *   **목적**: UI 코드(React 컴포넌트, 서비스 등)에서 메인 프로세스의 기능을 호출합니다.
    *   **수행 작업**: `window.electronAPI.myNewFunction(...args)`와 같이 `window.electronAPI` 객체를 통해 1단계에서 정의한 함수를 직접 호출합니다. 타입스크립트 환경에서 `window` 객체를 확장하려면 `src/renderer/global.d.ts` 파일에 타입 정의를 추가해야 할 수 있습니다.

---

## 7. 에셋 및 콘텐츠 파이프라인 (Asset & Content Pipeline)

애플리케이션은 VRM 모델, 애니메이션, 포즈 등 다양한 외부 에셋을 사용합니다. 에셋은 빌드 시 포함되는 **코어 에셋**과 사용자가 직접 추가하는 **유저 에셋**으로 나뉩니다.

### 에셋 로딩 워크플로우

1.  **코어 에셋 (`assets/`)**
    *   **위치**: 프로젝트 루트의 `assets/` 디렉토리. 이 디렉토리의 내용은 Webpack에 의해 빌드 시 애플리케이션에 패키징됩니다.
    *   **접근 방법**: `path-utils.ts`의 `getAssetPath()` 함수를 통해 접근해야 합니다. 이 함수는 개발 환경과 프로덕션(패키징된) 환경의 경로 차이를 자동으로 처리하여 올바른 절대 경로를 반환합니다. **파일 경로를 하드코딩해서는 안 됩니다.**

2.  **유저 에셋 (`userdata/`)**
    *   **위치**: 애플리케이션 설정 디렉토리 내의 `userdata/` 폴더. 이 폴더의 정확한 위치는 OS마다 다르며, `electron-store`가 관리합니다. (예: Windows의 `%APPDATA%`)
    *   **접근 방법**: `path-utils.ts`의 `getUserdataPath()` 함수를 통해 해당 디렉토리의 절대 경로를 얻을 수 있습니다. 이 경로를 기반으로 하위 디렉토리(vrm, animations 등)에 접근합니다.

### 주요 에셋 관리자

*   **VRM 모델**: `VRMManager`가 로딩과 관리를 담당합니다.
*   **애니메이션/포즈**: 관련 액션(`playAnimation`, `applyPose` 등) 내부에서 `getAssetPath` 또는 `getUserdataPath`를 통해 파일 경로를 조합하여 로드합니다. 현재는 중앙화된 관리자 없이 각 기능에서 직접 경로를 처리합니다.
    *   **시퀀스**: `SequenceManager`가 `userdata/sequences` 디렉토리의 `*.json` 파일들을 관리합니다.

---

## 8. 주요 파일 레퍼런스

이 섹션은 프로젝트의 핵심 파일과 각 파일의 역할을 한 줄로 요약합니다.

### Core Systems (`src/core/`)
-   `action-registry.ts`: 모든 `Action`의 정의와 구현체를 저장하는 중앙 레지스트리 클래스.
-   `action-registrar.ts`: 모든 코어 `Action`을 `ActionRegistry`에 실제로 등록하는 유일한 파일.
-   `character-state.ts`: 캐릭터의 핵심 상태(감정, 호기심 등)를 관리하는 중앙 객체.
-   `context-store.ts`: 플러그인과 모듈 간의 상태 공유를 위한 간단한 전역 키-값 저장소.
-   `event-bus.ts`: 시스템 전역에서 사용되는 이벤트의 타입과 `AppEvents`를 정의하는 중앙 통신 허브.
-   `event-definitions.ts`: 시퀀스 에디터의 '이벤트 노드' 목록에 표시될 이벤트를 정의하는 메타데이터 파일.
-   `mod-loader.ts`: `userdata/mods` 폴더에서 사용자 모드를 찾아 로드하고, 프록시 `PluginContext`를 생성.
-   `sequence/SequenceManager.ts`: 시퀀스의 파일 I/O, (비)활성화, 캐싱 등 모든 생명주기를 총괄하는 관리자.
-   `sequence/SequenceEngine.ts`: `SequenceManager`의 요청을 받아 시퀀스 노드 그래프의 실행을 담당하는 엔진.

### Plugin API (`src/plugin-api/`)
-   `actions.ts`: 플러그인에서 사용할 수 있는 모든 액션의 타입스크립트 인터페이스를 정의.
-   `plugin-context.ts`: 플러그인에 주입되는 `PluginContext`의 인터페이스를 정의하는 핵심 파일.
-   `context-factory.ts`: `PluginContext`의 실제 구현체를 생성하고 모든 API를 연결하는 팩토리.

### Plugins (`src/plugins/`)
-   `plugin-manager.ts`: 코어 플러그인과 사용자 모드의 등록 및 생명주기(`setup`, `onEnable` 등)를 관리.
-   `LlmResponseHandlerPlugin.ts`: `llm:responseReceived` 이벤트를 받아 TTS 재생, 표정 변경 등 실제 캐릭터 행동을 수행.

### Renderer (`src/renderer/`)
-   `App.tsx`: 모든 핵심 관리자(Manager)를 초기화하고 React Context를 통해 하위 컴포넌트에 제공하는 최상위 컴포넌트.
-   `vrm-manager.ts`: VRM 모델의 로딩, 애니메이션, 포즈, 표정 등 모든 저수준(low-level) 3D 캐릭터 제어를 담당.
-   `chat-service.ts`: 사용자 채팅 입력 처리, LLM API 호출, TTS 서비스 요청을 총괄하는 서비스.
-   `audio-service.ts`: TTS 백엔드로부터 받은 오디오 스트림을 실제로 재생하는 저수준 오디오 제어 서비스.
-   `scene-utils.ts`: 윈도우 리사이즈, 마우스 위치 추적 등 3D 씬과 관련된 유틸리티 함수 모음.
-   `components/scene/VRMCanvas.tsx`: Three.js의 `Scene`, `Renderer`, `Camera`를 설정하고 메인 애니메이션 루프를 실행하는 React 컴포넌트.

### Main Process (`src/main/`)
-   `index.ts`: Electron 앱의 생명주기, 윈도우 생성, 모든 IPC 핸들러 등록 등 메인 프로세스의 진입점.
-   `preload.ts`: 메인 프로세스의 기능(파일 시스템 접근 등)을 렌더러 프로세스에 안전하게 노출하는 보안 브릿지.
-   `path-utils.ts`: 개발/프로덕션 환경 간의 경로 차이를 해결하고 에셋 파일의 절대 경로를 제공하는 필수 유틸리티.

### Backend (`backend/`)
-   `main.py`: 텍스트를 음성으로 변환하는 TTS(Text-to-Speech) 기능을 제공하는 FastAPI 서버.
