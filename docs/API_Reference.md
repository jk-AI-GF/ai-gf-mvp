# AI-GF API Reference

이 문서는 AI-GF의 코어 플러그인 및 사용자 모드(Mod) 개발에 사용되는 핵심 API를 설명합니다.

## 1. `IPlugin` 인터페이스: 모든 플러그인의 기본 구조

모든 플러그인은 `IPlugin` 인터페이스를 구현해야 합니다.
-   **`setup(context)`**: 플러그인이 처음 로드될 때 한 번만 호출됩니다. `PluginContext`를 저장하는 등 초기 설정을 합니다.
-   **`onEnable()`**: 플러그인이 활성화될 때 호출됩니다. 이벤트 리스너 등록 등 실제 동작을 시작하는 코드를 여기에 작성합니다.
-   **`onDisable()`**: 플러그인이 비활성화될 때 호출됩니다. `onEnable`에서 등록한 모든 것을 정리(구독 해제 등)하여 메모리 누수를 방지합니다.
-   **`update(delta, vrm)`**: 활성화된 상태에서 매 프레임마다 호출됩니다.

## 2. `PluginContext`: 시스템 기능 접근 게이트웨이

`setup` 메소드를 통해 전달되는 `context` 객체는 플러그인이 시스템의 각종 기능과 상호작용하는 통로입니다.

-   `context.actions`: 캐릭터 제어, UI 변경 등 표준화된 동작을 실행합니다.
-   `context.eventBus`: 시스템의 다른 부분과 통신합니다.
-   `context.system`: TTS, 볼륨 등 시스템 설정을 제어합니다.
-   `context.vrmManager`: (렌더러 전용) 현재 VRM 모델에 직접 접근합니다.

## 3. Actions API (`context.actions`)

`actions`는 플러그인이 렌더러 프로세스에 안전하게 영향을 미치기 위한 **표준화된 명령 집합**입니다. `action-registrar.ts`에 등록된 모든 액션이 `context.actions` 객체에 동적으로 포함됩니다.

**주요 액션 목록:**
-   `playAnimation(animationName, loop, crossFadeDuration)`: 캐릭터 애니메이션을 재생합니다.
-   `setExpression(expressionName, weight, duration)`: 캐릭터 표정을 부드럽게 변경합니다.
-   `setPose(poseName)`: 캐릭터 포즈를 설정합니다.
-   `playTTS(text)`: TTS 음성을 재생합니다.
-   `showMessage(message, duration)`: 화면에 말풍선 메시지를 표시합니다.
-   `lookAt(target)`: 캐릭터 시선을 특정 대상('camera', 'mouse', `null`)으로 고정합니다.
-   `setContext(key, value)` / `getContext(key)`: 모든 플러그인이 공유하는 전역 저장소의 값을 읽고 씁니다.
-   `log(message)`: 개발자 콘솔에 디버그 메시지를 출력합니다.
-   *(전체 목록은 `action-registrar.ts` 참고)*

## 4. EventBus API (`context.eventBus`)

`EventBus`는 시스템의 여러 부분이 서로 직접적인 의존성 없이 통신하는 **발행/구독 시스템**입니다. 다음은 시퀀스 에디터에서 사용 가능한 주요 이벤트 목록입니다.

| 이벤트 이름                          | 설명                               | 데이터 (Payload)                                       |
| ------------------------------------ | ---------------------------------- | ------------------------------------------------------ |
| **Chat & LLM**                       |                                    |                                                        |
| `chat:newMessage`                    | 새 채팅 메시지 수신                | `{ role: string, text: string }`                       |
| `llm:responseReceived`               | LLM 응답 수신                      | `{ text: string, expression: string }`                 |
| **VRM & Character**                  |                                    |                                                        |
| `vrm:loaded`                         | VRM 모델 로드 완료                 | `{ expressionNames: string[] }`                        |
| `vrm:unloaded`                       | VRM 모델 언로드됨                  | -                                                      |
| `vrm:animationFinished`              | 애니메이션 재생 완료               | `{ clipName: string }`                                 |
| `vrm:poseApplied`                    | 포즈 적용 완료                     | `{ poseName: string }`                                 |
| `character_part_clicked`             | 캐릭터 신체 부위 클릭됨            | `{ partName: string }`                                 |
| `character_part_right_clicked`       | 캐릭터 신체 부위 우클릭됨          | `{ partName: string }`                                 |
| **UI & System**                      |                                    |                                                        |
| `ui:showFloatingMessage`             | 플로팅 메시지 표시 요청            | `{ text: string, duration: number }`                   |
| `ui:updateFloatingMessagePosition`   | 플로팅 메시지 위치 업데이트        | `{ left: number, top: number, visible: boolean }`      |
| `ui:editModeToggled`                 | 편집 모드 활성/비활성              | `{ isEditMode: boolean }`                              |
| `camera:setMode`                     | 카메라 모드 설정 요청              | `{ mode: 'orbit' \| 'fixed' }`                         |
| `camera:modeChanged`                 | 카메라 모드 변경됨                 | `{ mode: 'follow' \| 'free' }`                         |
| `system:mouse-ignore-toggle`         | 마우스 이벤트 무시 모드 전환       | `{ isIgnoring: boolean }`                              |
| **Plugin & Sequence**                |                                    |                                                        |
| `plugin:enabled` / `plugin:disabled` | 플러그인 활성화/비활성화됨         | `{ pluginName: string }`                               |
| `sequences-updated`                  | 시퀀스 목록 업데이트됨             | -                                                      |

*(전체 이벤트 목록 및 페이로드 상세 구조는 `src/core/event-definitions.ts` 참고)*

---

## 5. 레거시 API (Legacy)

> **경고**: 아래 API들은 새로운 **시퀀스 시스템**으로 대체될 예정이므로, 신규 기능 개발에 사용하는 것을 권장하지 않습니다.

-   **Trigger API (`context.registerTrigger`)**: `condition`과 `action` 함수를 등록하여 특정 조건 만족 시 로직을 실행하는 시스템입니다. 시퀀스의 `EventNode`와 `Branch` 노드로 대체됩니다.
-   **CustomTriggerManager**: 사용자가 직접 만든 트리거를 관리합니다. 시퀀스 파일 저장/로드 시스템으로 대체됩니다.