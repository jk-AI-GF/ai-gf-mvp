# 아키텍처 설명: Actions와 ContextStore

이 문서는 AI-GF MVP 프로젝트의 핵심 아키텍처 두 가지, `Actions` 시스템과 `ContextStore`에 대해 설명합니다. 이 두 시스템은 모드(Mod)가 애플리케이션의 코어 기능과 안전하고 효율적으로 상호작용하는 방법을 정의하며, 모딩 생태계의 기반을 이룹니다.

## 1. `Actions` 시스템: 모드의 행동 지시

`Actions`는 모드가 캐릭터나 시스템에 특정 행동을 지시할 때 사용하는 **명령의 집합**입니다. 이는 모드 개발자에게 제공되는 공식적인 API이며, `src/module-api/actions.ts` 파일의 `Actions` TypeScript 인터페이스에 모든 사용 가능한 명령이 정의되어 있습니다.

### 작동 원리

1.  **프로세스 분리:** AI-GF는 두 개의 주요 프로세스로 나뉩니다.
    *   **Main 프로세스:** 모드 로딩, 시스템 로직, `ContextStore` 관리 등 백그라운드 작업을 처리합니다.
    *   **Renderer 프로세스:** Three.js를 사용한 3D 캐릭터 렌더링, UI, 오디오 재생 등 사용자에게 보여지는 모든 것을 처리합니다.

2.  **명령 전달 (IPC):** 모드는 Main 프로세스에서 실행됩니다. 모드가 `actions.playAnimation(...)`과 같은 명령을 호출하면, 이 명령은 직접 렌더링 코드를 실행하는 것이 아닙니다. 대신, Electron의 **IPC(Inter-Process Communication)** 통신을 통해 Renderer 프로세스에 "이 애니메이션을 재생해줘"라는 메시지를 보냅니다.

3.  **실제 행동 실행:** Renderer 프로세스는 이 메시지를 수신하고, 메시지에 해당하는 실제 렌더링 코드(예: `vrmManager.playAnimation(...)`)를 실행합니다.

### 장점

*   **안정성:** 모드가 렌더링 엔진의 민감한 코드에 직접 접근하는 것을 막아줍니다. 정의된 `Actions` API를 통해서만 상호작용하므로, 잘못된 모드가 앱 전체를 중단시키는 것을 방지합니다.
*   **단순성:** 모드 개발자는 복잡한 3D 렌더링 원리를 몰라도 `actions.playAnimation('happy')`처럼 간단한 명령으로 원하는 결과를 얻을 수 있습니다.
*   **확장성:** 새로운 기능을 추가하고 싶을 때, `Actions` 인터페이스와 그 구현체만 수정하면 되므로 시스템을 확장하기 용이합니다.

## 2. `ContextStore`: 모듈들의 공용 메모장

`ContextStore`는 애플리케이션의 **중앙 데이터 저장소**입니다. `src/core/context-store.ts`에 클래스로 구현되어 있으며, Main 프로세스에 단 하나만 존재하는 싱글턴 객체입니다.

### 역할과 중요성

`ContextStore`의 핵심 역할은 **모듈들이 서로 상태를 공유하고, 과거의 이벤트를 기억하게 만드는 것**입니다. 이를 통해 모듈들이 독립적으로 움직이는 것을 넘어, 서로 유기적으로 협력하여 더 지능적이고 일관된 사용자 경험을 만들 수 있습니다.

모드는 `ContextStore`에 직접 접근할 수 없으며, 반드시 `actions.setContext(key, value)`와 `actions.getContext(key)`를 통해서만 데이터를 읽고 쓸 수 있습니다.

### 사용 예시: 사용자의 별명 기억하기

1.  **`NicknameMod` (A 모듈):** 사용자가 "나를 '주인님'이라고 불러줘" 라고 말하는 것을 감지합니다.
    *   `context.actions.setContext('user_nickname', '주인님');`를 호출하여 이 정보를 `ContextStore`에 저장합니다.

2.  **`GreetingMod` (B 모듈):** 아침 인사를 할 시간이 되었습니다.
    *   인사하기 전에 `const nickname = context.actions.getContext('user_nickname');`를 호출하여 저장된 별명을 확인합니다.
    *   `nickname` 값이 존재하면, "좋은 아침입니다, 주인님." 이라고 맞춤형 인사를 합니다.

이처럼 `ContextStore`는 모듈 간의 직접적인 의존성 없이도 데이터를 공유하게 해주는 강력한 "공용 메모장" 역할을 수행합니다.

## 3. 시스템 흐름 요약

```
+-----------------------+         +--------------------------+         +-------------------------+
|       모드 (Mod)      |         |   ModLoader (Main Proc)  |         |   Renderer (Rend. Proc) |
| (in Main Process)     |         +--------------------------+         +-------------------------+
+-----------------------+                   |                                      |
           |                                |                                      |
           | context.actions.setContext()   |                                      |
           |------------------------------->|                                      |
           |                                | contextStore.set(key, value)         |
           |                                |------------------------------------->| (ContextStore에 저장)
           |                                |                                      |
           | context.actions.playAnimation()|                                      |
           |------------------------------->|                                      |
           |                                | sendToRenderer('play-animation',...) |
           |                                |------------------------------------->|
           |                                |                                      | vrmManager.playAnimation()
           |                                |                                      | (실제 애니메이션 재생)
```

이러한 구조를 통해 모드 개발자에게는 사용하기 쉬운 API를 제공하는 동시에, 시스템의 안정성과 확장성을 보장하는 것을 목표로 합니다.
