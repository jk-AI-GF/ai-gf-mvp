# AI-GF API Reference

이 문서는 AI-GF의 코어 플러그인 및 사용자 모드(Mod) 개발에 사용되는 핵심 API를 설명합니다. 모든 기능 개발은 이 표준 API를 통해 이루어지는 것을 권장합니다.

## 1. Actions API

`Actions`는 플러그인 및 모드가 렌더러 프로세스 전반에 안전하게 영향을 미치기 위해 제공되는 **표준화된 게이트웨이(Gateway)**입니다. 캐릭터의 동작 제어뿐만 아니라, UI, 환경, 전역 상태 등 렌더러가 관리하는 여러 요소와 상호작용할 수 있는 공식적인 통로입니다.

이를 통해 외부 코드(플러그인, 모드)는 렌더러의 복잡한 내부 구현(DOM 구조, Three.js 객체 등)을 직접 알 필요 없이, **시스템이 허용한 범위 내에서** 다양한 기능을 실행할 수 있습니다.

모든 `Actions`는 플러그인 또는 UI 컴포넌트에서 `pluginManager.context.actions`를 통해 접근할 수 있습니다.

---

### `playAnimation(animationName, loop, crossFadeDuration)`

캐릭터에게 특정 애니메이션을 재생하도록 지시합니다.

-   **`animationName`** (`string`): 재생할 애니메이션 파일의 경로. `assets` 폴더 또는 모드의 `assets` 폴더 기준입니다. (예: `Animation/Idle.vrma`, `MyMod/Jump.fbx`)
-   **`loop`** (`boolean`, Optional, Default: `false`): 애니메이션 반복 여부.
-   **`crossFadeDuration`** (`number`, Optional, Default: `0.5`): 이전 애니메이션과의 교차 페이드 시간(초).

**예시:**
```typescript
// 점프 애니메이션을 한 번 재생
actions.playAnimation('Animation/Jump.vrma', false);
```

---

### `setExpression(expressionName, weight, duration)`

캐릭터의 표정을 변경합니다.

-   **`expressionName`** (`string`): VRM 모델에 포함된 표정의 이름. (예: `happy`, `sad`, `angry`)
-   **`weight`** (`number`): 표정의 강도 (0.0 ~ 1.0).
-   **`duration`** (`number`, Optional, Default: `0.1`): 표정이 최대 강도에 도달하기까지 걸리는 시간(초).

**예시:**
```typescript
// 0.5초에 걸쳐 행복한 표정을 짓게 함
actions.setExpression('happy', 1.0, 0.5);
```

---

### `setPose(poseName)`

캐릭터에게 특정 포즈를 적용합니다. 포즈는 애니메이션의 한 프레임일 수 있습니다.

-   **`poseName`** (`string`): 적용할 포즈 파일의 경로. (예: `Pose/T-Pose.vrma`)

**예시:**
```typescript
actions.setPose('Pose/Stand_01.vrma');
```

---

### `speak(text)`

캐릭터가 주어진 텍스트를 말하게 합니다. (TTS 기능 및 자막 표시)

-   **`text`** (`string`): 캐릭터가 말할 내용.

**예시:**
```typescript
actions.speak("안녕하세요! 만나서 반가워요.");
```

---

### `lookAt(target)`

캐릭터의 시선을 특정 대상으로 향하게 합니다.

-   **`target`** (`'camera' | 'mouse' | [number, number, number] | null`):
    -   `'camera'`: 사용자의 카메라를 응시합니다.
    -   `'mouse'`: 마우스 커서를 따라다닙니다.
    -   `[x, y, z]`: 월드 좌표의 특정 지점을 응시합니다.
    -   `null`: 시선 고정을 해제하고 정면을 보게 합니다.

**예시:**
```typescript
// 사용자를 바라보게 함
actions.lookAt('camera');

// 시선 고정 해제
actions.lookAt(null);
```

---

### `showMessage(message, duration)`

화면에 채팅 메시지를 표시합니다. `speak`와 달리 음성은 나오지 않습니다.

-   **`message`** (`string`): 표시할 메시지.
-   **`duration`** (`number`, Optional): 메시지가 표시될 시간(초). (현재 미사용)

**예시:**
```typescript
actions.showMessage("시스템 메시지를 표시합니다.");
```

---

### `changeBackground(imagePath)`

애플리케이션의 배경 이미지를 변경합니다.

-   **`imagePath`** (`string`): 표시할 이미지 파일의 경로.

**예시:**
```typescript
actions.changeBackground('MyMod/assets/background.png');
```

---

### `getContext(key)` & `setContext(key, value)`

전역 컨텍스트 저장소에 데이터를 읽거나 씁니다. 모드 간의 데이터 공유나 상태 저장을 위해 사용됩니다.

-   **`key`** (`string`): 데이터의 키.
-   **`value`** (`any`): 저장할 데이터.

**예시:**
```typescript
// 플레이어의 점수를 저장
actions.setContext('playerScore', 100);

// 저장된 점수를 읽어옴
const score = await actions.getContext('playerScore');
```

## 2. EventBus API

`EventBus`는 시스템의 여러 부분(UI, 플러그인, 코어 시스템)이 서로 직접적인 의존성 없이 통신할 수 있게 해주는 발행/구독 시스템입니다. `pluginContext.eventBus` 또는 `import eventBus from '../core/event-bus'`를 통해 접근할 수 있습니다.

### 주요 이벤트 목록

#### `chat:newMessage`
-   **설명**: 사용자 또는 AI의 새로운 채팅 메시지가 발생했을 때 발행됩니다.
-   **데이터**: `{ role: 'user' | 'assistant' | 'system', text: string }`
-   **주요 구독자**: `Chat.tsx`, `FloatingMessageManager.tsx`

#### `vrm:loaded` / `vrm:unloaded`
-   **설명**: VRM 모델이 로드되거나 언로드될 때 발행됩니다.
-   **데이터**: `vrm:loaded`의 경우 `{ vrm: VRM }`
-   **주요 구독자**: `VRMCanvas.tsx`, 각종 UI 패널

#### `ui:updateFloatingMessagePosition`
-   **설명**: 캐릭터 머리 위 플로팅 메시지의 위치를 업데이트하기 위해 매 프레임 발행됩니다.
-   **데이터**: `{ left: number, top: number, visible: boolean }`
-   **주요 구독자**: `FloatingMessageManager.tsx`

### 사용 방법

```typescript
// 이벤트 발행
eventBus.emit('myCustomEvent', { value: 42 });

// 이벤트 구독
const unsubscribe = eventBus.on('myCustomEvent', (data) => {
  console.log('받은 데이터:', data.value); 
});

// 컴포넌트 언마운트 시 구독 해제
// unsubscribe();
```

## 3. Trigger API

`Trigger`는 **"어떤 조건이 충족되었을 때, 특정 행동을 실행"**하는 로직을 선언적으로 등록하는 시스템입니다. 복잡한 상호작용을 모듈화하고 재사용 가능하게 만드는 데 사용됩니다. `pluginContext.registerTrigger`를 통해 접근합니다.

### `registerTrigger(condition, action)`

-   **`condition`** (`() => boolean`): 매 프레임 또는 주기적으로 평가될 조건 함수. `true`를 반환하면 `action`이 실행됩니다.
-   **`action`** (`() => void`): `condition`이 `true`를 반환했을 때 실행될 함수.

**예시:**
```typescript
// 30초마다 "안녕하세요"라고 말하는 Trigger
context.registerTrigger(
  // Condition: 마지막으로 말한 시간으로부터 30초가 지났는가?
  () => Date.now() - context.characterState.lastSpokenTimestamp > 30000,
  // Action: 말하고, 마지막으로 말한 시간을 업데이트한다.
  () => {
    context.actions.speak("안녕하세요!");
    context.characterState.lastSpokenTimestamp = Date.now();
  }
);
```

## 4. SystemControls API

`SystemControls`는 애플리케이션의 시스템 레벨 설정을 제어하는 인터페이스입니다. `Actions`가 캐릭터의 '행동'을 다룬다면, `SystemControls`는 TTS나 볼륨과 같은 시스템의 '상태'나 '설정'을 변경하는 데 사용됩니다. `pluginContext.system`을 통해 접근할 수 있습니다.

---

### `toggleTts(enable)`

TTS(Text-to-Speech) 기능을 활성화하거나 비활성화합니다.

-   **`enable`** (`boolean`): TTS 기능을 활성화할지(`true`) 비활성화할지(`false`) 여부.

**예시:**
```typescript
// TTS 기능 끄기
context.system.toggleTts(false);
```

---

### `setMasterVolume(volume)`

애플리케이션의 마스터 볼륨을 설정합니다.

-   **`volume`** (`number`): 볼륨 값 (0.0에서 1.0 사이).

**예시:**
```typescript
// 전체 볼륨을 50%로 설정
context.system.setMasterVolume(0.5);
```
