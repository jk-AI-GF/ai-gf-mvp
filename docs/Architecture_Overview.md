# 아키텍처 개요

이 문서는 AI-GF 프로젝트의 코드베이스를 구성하는 주요 파일과 디렉토리의 역할과 책임을 설명합니다. 새로운 개발자가 코드의 구조를 이해하고 어디를 수정해야 할지 찾는 데 도움을 주는 것을 목표로 합니다.

## 1. 프로세스 및 디렉토리 구조

-   **`src/main/` (메인 프로세스)**: Electron 애플리케이션의 생명주기, 윈도우 관리, 시스템 레벨 기능(설정 저장, 단축키 등)을 담당합니다. Node.js 환경에서 실행됩니다.
-   **`src/renderer/` (렌더러 프로세스)**: 사용자에게 보여지는 모든 UI와 캐릭터 렌더링을 담당합니다. Chromium 웹 브라우저 환경에서 실행됩니다.
-   **`src/core/`**: 두 프로세스에서 모두 사용될 수 있는 핵심 로직, 엔진, 데이터 구조가 위치합니다.
-   **`src/plugin-api/`**: 플러그인 개발을 위한 공식 API 인터페이스를 정의합니다.
-   **`userdata/`**: 사용자가 생성하는 데이터(모드, 시퀀스, 설정 등)가 저장되는 공간입니다.

---

## 2. 메인 프로세스 (`src/main/`)

### `index.ts` - 애플리케이션 진입점 및 윈도우 관리

-   **역할**: Electron 앱의 메인 진입점. 브라우저 윈도우 생성, 시스템 이벤트 처리, IPC 통신 핸들러 설정을 담당합니다.
-   **주요 동작 방식**:
    1.  **설정 관리 (`electron-store`)**:
        -   `electron-store`를 사용하여 모든 사용자 설정을 `config.json` 파일에 중앙 관리합니다.
        -   렌더러 프로세스는 직접 설정 파일을 읽거나 쓰지 않으며, 반드시 `preload.ts`를 통해 노출된 IPC API(`get-settings`, `set-api-key` 등)로 메인 프로세스에 요청해야 합니다. 이는 데이터 일관성과 보안을 보장합니다.
    2.  **윈도우 동작 제어**:
        -   **클릭 통과 (Click-Through)**: `Ctrl+Shift+O` 단축키로 마우스 클릭을 창 뒤로 통과시키는 기능을 제어합니다.
        -   **투명 창 깜빡임 해결**: Windows에서 프레임 없는 투명 창이 포커스를 잃을 때 OS가 타이틀 바를 강제로 표시하는 문제가 있습니다. 이를 해결하기 위해, 창의 `blur` (포커스 잃음) 이벤트를 감지하여 창을 아주 잠깐 숨겼다가 다시 표시함으로써 UI를 올바르게 새로 그리도록 강제합니다. 이로 인해 발생하는 미세한 깜빡임은 의도된 정상 동작입니다.

### `preload.ts` - 보안 브릿지

-   **역할**: 메인 프로세스의 기능(IPC 통신 등)을 렌더러 프로세스에 안전하게 노출하는 브릿지 역할을 합니다. `contextBridge`를 사용하여 `window.electronAPI` 객체를 렌더러에 주입합니다.

---

## 3. 렌더러 프로세스 (`src/renderer/`)

### `contexts/AppContext.tsx` - 애플리케이션의 심장부

-   **역할**: `vrmManager`, `pluginManager`, `sequenceManager` 등 애플리케이션의 핵심 관리자 인스턴스를 생성하고, React Context API를 통해 모든 하위 컴포넌트에 제공합니다.

### `vrm-manager.ts` - 캐릭터 제어의 실제 구현

-   **역할**: VRM 모델의 로딩, 애니메이션, 표정, 포즈 등 캐릭터와 관련된 모든 저수준(low-level) 제어를 직접 담당하는 클래스입니다. 모든 `Action`의 최종 목적지입니다.

### `components/SequenceEditor/` - 시퀀스 에디터 UI

-   **역할**: 비주얼 스크립팅 "시퀀스" 시스템의 UI(View)를 담당합니다. `React Flow`를 기반으로 하며, `core/sequence`에 정의된 모델의 데이터를 받아 화면에 렌더링하는 역할에 집중합니다.

---

## 4. 핵심 로직 및 엔진 (`src/core/`)

### `sequence/` - 시퀀스 시스템의 두뇌

-   **`SequenceManager.ts`**: 시퀀스의 전체 생명주기(파일 I/O, (역)직렬화, 상태 관리, 실행 요청 중계)를 총괄하는 중앙 관리자입니다.
-   **`SequenceEngine.ts`**: `SequenceManager`의 요청을 받아 실제 시퀀스 그래프의 실행(실행 흐름, 데이터 흐름)을 담당하는 엔진입니다.
-   **`BaseNode.ts` 및 하위 모델들**: 모든 시퀀스 노드의 공통 로직과 개별 로직을 정의하는 모델 클래스들입니다.

### `action-registry.ts` & `action-registrar.ts` - 액션 관리

-   **`action-registry.ts`**: `ActionRegistry` 클래스를 정의합니다. 액션의 메타데이터와 구현을 함께 저장하는 중앙 저장소입니다.
-   **`action-registrar.ts`**: **모든 코어 액션이 등록되는 유일한 파일**입니다. 새로운 코어 액션을 추가할 때 이 파일만 수정하면 됩니다.

### `event-bus.ts` & `event-definitions.ts` - 이벤트 관리

-   **`event-bus.ts`**: 애플리케이션 전역에서 사용되는 발행/구독(Pub/Sub) 이벤트 버스입니다.
-   **`event-definitions.ts`**: 시퀀스 에디터에 노출될 이벤트들의 상세 메타데이터(설명, 데이터 구조)를 정의합니다.

---

## 5. 플러그인 아키텍처 (`src/plugins/` & `src/plugin-api/`)

-   **`plugin-manager.ts`**: 모든 플러그인(코어, 사용자 모드)의 생명주기를 총괄하는 핵심 관리자입니다. `PluginContext`를 주입하고, `setup`, `onEnable`, `onDisable`, `update` 메서드를 적절한 시점에 호출합니다.
-   **`plugin-api/context-factory.ts`**: **`PluginContext` 생성의 유일한 책임자**입니다. `ActionRegistry` 등의 정보를 기반으로, 렌더러 프로세스에서 사용될 완전한 `PluginContext` 객체를 생성합니다.
-   **`core/mod-loader.ts`**: `userdata/mods` 폴더에서 사용자 모드를 로드합니다. **메인 프로세스에서 동작하는 모드를 위해, IPC 프록시 `PluginContext`를 동적으로 구성하여** 렌더러의 기능을 안전하게 호출할 수 있도록 중계합니다.