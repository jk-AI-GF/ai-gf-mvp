# EventBus 시스템 가이드

## 1. EventBus란?

EventBus는 애플리케이션의 여러 부분(모듈, UI, 3D 렌더러 등)이 서로 직접적으로 의존하지 않고 통신할 수 있도록 하는 중앙 메시징 시스템입니다. "발행/구독(Publish/Subscribe)" 패턴을 사용하여, 시스템의 한 부분에서 발생한 사건(이벤트)을 다른 부분들이 구독하여 처리할 수 있게 합니다.

이 아키텍처는 코드 간의 결합도를 낮추어, 기능을 독립적으로 개발하고 확장하기 쉽게 만듭니다. 특히 사용자가 만드는 Mod가 코어 시스템과 안전하게 상호작용할 수 있는 핵심적인 통로 역할을 합니다.

## 2. 핵심 흐름

`센서 → 이벤트 → 액션` 흐름에서 EventBus는 **이벤트**를 담당합니다.

1.  **센서 (Sensor)**: 사용자의 클릭, 특정 시간 경과, AI의 상태 변화 등 어떤 사건을 감지합니다. (예: `renderer.ts`의 마우스 클릭 감지)
2.  **이벤트 발행 (Emit)**: 감지된 사건을 EventBus를 통해 시스템 전체에 알립니다. 이때 이벤트의 종류를 나타내는 `type`과 필요한 데이터 `payload`를 함께 전달합니다.
3.  **이벤트 구독 (Subscribe)**: Mod나 다른 모듈들은 자신이 관심 있는 이벤트를 EventBus에 미리 등록(구독)해 둡니다.
4.  **액션 (Action)**: 이벤트를 수신한 구독자는 그에 맞는 동작(액션)을 수행합니다. (예: `showMessage` 액션 호출)

## 3. 주요 이벤트 목록 (`AppEvents`)

`src/core/event-bus.ts`의 `AppEvents` 타입에 모든 이벤트가 정의되어 있습니다.

| 이벤트 이름                  | 설명                               | 전달 데이터 (Payload)        | 발행 주체 (예시)      |
| ---------------------------- | ---------------------------------- | ---------------------------- | --------------------- |
| `vrm:loaded`                 | 새 VRM 모델 로딩이 완료되었을 때.  | `{ vrm: VRM }`               | `VRMManager`          |
| `vrm:unloaded`               | 기존 VRM 모델이 제거되었을 때.     | `void`                       | `VRMManager`          |
| `character_part_clicked`     | 캐릭터의 특정 부위가 **좌클릭**되었을 때.| `{ partName: string }`       | `renderer.ts`         |
| `character_part_right_clicked` | 캐릭터의 특정 부위가 **우클릭**되었을 때.| `{ partName: string }`       | `renderer.ts`         |
| `action:play-expression`     | 표정을 재생하라는 명령.            | `{ name, weight, ... }`      | 모듈 (Action API)     |
| `action:play-clip`           | 애니메이션 클립을 재생하라는 명령. | `{ clip: string }`           | 모듈 (Action API)     |
| `scene:tick`                 | 매 프레임마다 발생하는 틱 이벤트.  | `{ dt, time }`               | `renderer.ts` (예정)  |
| `error`                      | 시스템에서 오류가 발생했을 때.     | `{ scope, error }`           | 모든 시스템           |

## 4. 이벤트 사용 방법 (Mod 개발자 가이드)

Mod나 새로운 모듈에서 이벤트를 사용하려면 `ModuleContext`를 통해 `eventBus`에 접근합니다.

### 이벤트 구독 (Listening to Events)

`onEnable`이나 `setModuleContext`에서 구독을 시작하고, `onDisable`에서 구독을 해제하는 것이 좋습니다. (메모리 누수 방지)

```typescript
import { Imodule, ModuleContext } from '...';

export class MyCustomModule implements Imodule {
    private context: ModuleContext | null = null;
    private unsubscribers: (() => void)[] = []; // 구독 해제 함수 저장

    setModuleContext(context: ModuleContext): void {
        this.context = context;
    }

    onEnable(): void {
        if (!this.context) return;

        // 'vrm:loaded' 이벤트가 발생하면 콘솔에 로그를 남깁니다.
        const unsubLoaded = this.context.eventBus.on('vrm:loaded', ({ vrm }) => {
            const modelName = 'name' in vrm.meta ? vrm.meta.name : (vrm.meta as any).title;
            console.log(`새로운 모델 ${modelName}이 로드되었습니다!`);
            this.context.actions.showMessage('반가워요!', 3);
        });

        // 'character_part_clicked' 이벤트가 발생하면 반응합니다.
        const unsubClicked = this.context.eventBus.on('character_part_clicked', ({ partName }) => {
            if (partName === 'head') {
                this.context.actions.setExpression('happy', 1.0, 0.5);
            }
        });

        // 구독 해제 함수들을 배열에 저장합니다.
        this.unsubscribers.push(unsubLoaded, unsubClicked);
    }

    onDisable(): void {
        // 모듈이 비활성화될 때 모든 구독을 해제합니다.
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }

    // ...
}
```

### 새로운 이벤트 정의 및 발행

새로운 이벤트를 추가하려면 먼저 `src/core/event-bus.ts`의 `AppEvents`에 타입을 정의해야 합니다.

```typescript
// 1. event-bus.ts에 타입 추가
export type AppEvents = {
  // ... 기존 이벤트들
  'my_custom_event': { someData: number };
}

// 2. 시스템의 적절한 위치에서 이벤트 발행
// 예: 어떤 조건이 만족되었을 때
this.eventBus.emit('my_custom_event', { someData: 123 });
```

## 5. 구조 개선 제안

### 디버깅 및 로깅 (적용 완료)

-   **내용**: 개발 모드(`NODE_ENV !== 'production'`)에서 실행 시, 모든 `emit` 호출이 브라우저 개발자 콘솔에 기록됩니다. 어떤 이벤트가 어떤 데이터와 함께 발행되는지 쉽게 추적할 수 있어 디버깅에 매우 유용합니다.
-   **상태**: `event-bus.ts`에 구현이 완료되었습니다. 프로덕션 빌드 시에는 자동으로 비활성화됩니다.

    ```
    [EventBus] Emit: vrm:loaded { vrm: VRM_OBJECT }
    ```

### 비동기 처리 및 우선순위 (미래 확장 고려)

-   **내용**: 현재 모든 이벤트 리스너는 동기적으로 실행됩니다. 하지만 향후 리스너 간의 실행 순서를 보장하거나, 특정 리스너의 비동기 작업이 끝날 때까지 기다려야 할 필요가 생길 수 있습니다. 이를 위해 `on` 함수에 `priority` 옵션을 추가하거나, `emit`이 `Promise`를 반환하도록 개선하는 방향을 고려할 수 있습니다.
-   **상태**: 현재는 필요하지 않으므로 구현되지 않았습니다. 향후 모듈 간의 상호작용이 복잡해질 경우 도입을 검토할 수 있습니다.