- 이건 Window 환경입니다.

- 사용자가 직접적으로 설명을 요청 했을 때는 한국어로 답변 해주세요.

- 개발 기획은 다음과 같습니다.

- ContextStore (키-값 메모장), Appcontext
- 프로젝트 아키텍쳐 구조와 코드의 가독성, 유지보수, 재사용 가능성을 최우선으로 고려하세요.
- EventBus / TriggerEngine / Action 인터페이스를 적극 활용해주세요.
- PluginContext 타입과 API (register, get/set 등)

유저 참여형 구조, Moding 생태계 구축이 최우선 과제
간편한 시퀀스 조립 툴
모더들을 위한 놀이터(샌드박스)를 우리가 제공해주는 것

- 원래 요청의 범위를 넘어서는 구조적 변경이 필요하다고 판단될 경우, 반드시 먼저 그 필요성을 설명하고 동의를 구한 후에 작업을 진행한다.

---
## 문서 요약 (2025-07-28)

### 핵심 아키텍처
- **`AppContext.tsx`**: `vrmManager`, `pluginManager` 등 핵심 관리자를 생성하고 제공하는 애플리케이션의 심장부.
- **`PluginManager`**: 모든 플러그인(코어, 사용자 모드)의 생명주기를 관리하고 `PluginContext`를 주입.
- **`PluginContext`**: 플러그인이 시스템과 안전하게 상호작용하는 표준 API 게이트웨이. 코어 기능과 사용자 모드는 이 컨텍스트를 통해 동등한 권한을 가짐.
- **`userdata/mods/`**: 사용자가 직접 만든 모드를 위치시키는 폴더.

### 주요 API (`PluginContext` 통해 접근)
- **Actions (`context.actions`)**: 캐릭터/시스템을 제어하는 명령 집합.
- **Triggers (`context.registerTrigger`)**: `registerTrigger(condition, action)` 형태로 특정 조건 만족 시 로직을 실행. "언제"와 "무엇을" 할지 분리.
- **EventBus (`context.eventBus`)**: `emit/on`으로 모듈 간의 의존성을 낮추는 통신 채널.

---
## 아키텍처 주의사항 (2025-07-28 기록)
- `PluginContext`는 메인 프로세스(`mod-loader.ts`)와 렌더러 프로세스(`context-factory.ts`)에서 **별도로 생성되며, 그 내용이 다릅니다.**
  - **메인 프로세스 컨텍스트:** 실제 구현이 없으며, 모든 `actions` 호출을 렌더러로 전달하는 **IPC 프록시(Proxy)** 역할을 합니다.
  - **렌더러 프로세스 컨텍스트:** `vrmManager` 등 실제 관리자를 직접 호출하는 **실제 구현체**를 가집니다.
  - 따라서 `vrmManager`와 같이 렌더러에만 존재하는 속성은 `PluginContext` 인터페이스에서 항상 **선택적(optional, `?`)**으로 다루어야 합니다.

---
## 프로젝트 비전 및 로드맵 (2025-08-01 기록)

### 최종 비전: 노드 기반 비주얼 스크립팅 "시퀀스"
- **목표**: 사용자가 코딩 없이 복잡한 상호작용을 만들 수 있는 노드 그래프 시스템을 구축한다. (`docs/Vision_Visual_Scripting.md` 참고)
- **핵심 개념**:
    - **시퀀스**: 사용자가 만들고 공유하는 노드 그래프의 단위.
    - **노드**: 이벤트, 액션, 제어 흐름, 데이터 노드로 구성.
    - **데이터 흐름**: 노드 간에 값을 전달하여 동적인 로직을 구현.
- **기술 스택**: `React Flow`를 UI 라이브러리로 사용.

### 주요 아키텍처 결정 및 개선 방향
- **클래스 상속 모델**: 모든 노드는 공통 `BaseNode` 클래스를 상속받아, `execute()` 메소드를 각자 구현하는 방식으로 설계한다.
- **최우선 개선 과제**: `ActionRegistry`를 도입하여, 현재 수동으로 관리되는 액션 등록 프로세스를 완전 자동화한다. 이는 모든 향후 개발의 생산성과 직결된다. (`docs/Project_Roadmap_and_Improvements.md` 참고)
- **`PluginContext` 동등성 원칙**: 기술적으로 렌더러의 코어 플러그인이 더 많은 권한을 갖지만, "모든 유용한 기능은 반드시 `Action`으로 만들어 공개한다"는 원칙을 통해 기능적 동등성을 지향한다.

### 향후 레거시가 될 기능
- **비주얼 스크립팅 시스템이 완성되면, 다음 기능들은 대체된다.**
  - `TriggerEditorPanel.tsx`
  - `CustomTriggerManager.ts`
  - `TriggerEngine.ts`
- **`Actions API`, `EventBus`, `ContextStore`는 레거시가 아니라, 새로운 시스템의 더욱 중요한 기반(Foundation)이 된다.**