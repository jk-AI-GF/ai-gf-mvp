# AI-GF API Reference

이 문서는 AI-GF의 코어 플러그인 및 사용자 모드(Mod) 개발에 사용되는 핵심 API를 설명합니다. 모든 기능 개발은 이 표준 API를 통해 이루어지는 것을 권장합니다.

## 1. `IPlugin` 인터페이스: 모든 플러그인의 기본 구조

모든 플러그인(코어 기능, 사용자 모드)은 `IPlugin` 인터페이스를 구현하는 클래스로 만들어져야 합니다. 이 구조는 플러그인이 시스템에 의해 일관되게 관리되고 실행되도록 보장합니다.

```typescript
// src/plugins/plugin-manager.ts 에 정의된 인터페이스
export interface IPlugin {
  readonly name: string;
  enabled: boolean;
  runInEditMode?: boolean;

  // 플러그인이 처음 등록될 때 한 번 호출
  setup(context: PluginContext): void;

  // 플러그인이 활성화될 때 호출
  onEnable(): void;

  // 플러그인이 비활성화될 때 호출
  onDisable(): void;
  
  // 활성화된 상태에서 매 프레임마다 호출
  update(delta: number, vrm: VRM): void;
}
```

### 생명주기(Lifecycle) 및 필수 속성

-   **`name`** (`string`, `readonly`): 플러그인을 식별하는 고유한 이름입니다. (예: `'AutoBlink'`)
-   **`enabled`** (`boolean`): 플러그인의 현재 활성화 상태를 나타냅니다. 이 값은 `PluginManager`에 의해 내부적으로 관리되므로 직접 수정해서는 안 됩니다.
-   **`runInEditMode`** (`boolean`, Optional, Default: `false`): `true`로 설정하면, 사용자가 '편집 모드'에 진입해도 이 플러그인이 비활성화되지 않고 계속 실행됩니다. 캐릭터를 직접 조작하는 플러그인(예: `GrabVrmPlugin`)에 유용합니다.

### 생명주기 메서드

-   **`setup(context)`**: 플러그인이 `PluginManager`에 등록될 때 **단 한 번만** 호출됩니다. `context`를 클래스 속성에 저장하는 등, 플러그인의 가장 기본적인 초기화 작업을 수행합니다. **이벤트 리스너 등록 등 실제 동작과 관련된 로직은 `onEnable`에 작성해야 합니다.**
    -   `context`: 플러그인이 시스템 기능(Actions, EventBus 등)에 접근할 수 있는 API 집합입니다.

-   **`onEnable()`**: 플러그인이 활성화될 때 호출됩니다. `PluginManager`는 다음과 같은 상황에서 이 메서드를 호출합니다.
    1.  플러그인이 처음 등록될 때 (편집 모드가 아닌 경우)
    2.  사용자가 '편집 모드'를 종료할 때
    3.  (향후 추가될) 사용자가 UI를 통해 플러그인을 직접 켤 때
    
    **모든 이벤트 리스너 등록, `setInterval`/`setTimeout` 설정 등 플러그인의 실제 동작을 시작하는 코드는 반드시 이 메서드 안에 위치해야 합니다.**

-   **`onDisable()`**: 플러그인이 비활성화될 때 호출됩니다. `onEnable`에서 등록했던 모든 것을 완벽하게 "정리"하는 역할을 합니다.
    -   `eventBus` 구독 해제, `document.removeEventListener` 호출, `clearInterval` 등을 통해 모든 동작을 확실히 멈춰야 합니다. 이는 메모리 누수를 방지하고 원치 않는 동작을 막는 데 매우 중요합니다.

-   **`update(delta, vrm)`**: 플러그인이 `enabled` 상태일 때, 매 프레임마다 호출됩니다. 캐릭터의 지속적인 상태 변화 로직을 여기에 구현합니다.
    -   `delta`: 이전 프레임으로부터 경과한 시간(초)입니다.
    -   `vrm`: 현재 로드된 VRM 모델의 인스턴스입니다.

---

## 2. Actions API (`context.actions`)

`Actions`는 플러그인 및 모드가 렌더러 프로세스 전반에 안전하게 영향을 미치기 위해 제공되는 **표준화된 게이트웨이(Gateway)**입니다. 캐릭터의 동작 제어뿐만 아니라, UI, 환경 등 렌더러가 관리하는 여러 요소와 상호작용할 수 있는 공식적인 통로입니다.

`context.actions` 객체는 **동적으로 생성**됩니다. 애플리케이션이 시작될 때 `ActionRegistry`에 등록된 모든 액션들이 자동으로 이 객체에 포함됩니다. 따라서 여기에 문서화된 액션 외에도, 코어 플러그인이나 다른 모드가 추가한 새로운 액션이 존재할 수 있습니다.

이를 통해 외부 코드(플러그인, 모드)는 렌더러의 복잡한 내부 구현(DOM 구조, Three.js 객체 등)을 직접 알 필요 없이, **시스템이 허용한 범위 내에서** 다양한 기능을 실행할 수 있습니다.

---

### `getAvailableActions()`

현재 `ActionRegistry`에 등록된 모든 액션의 목록과 정의(메타데이터)를 반환합니다. 이 API는 트리거 에디터와 같이 사용자가 선택할 수 있는 액션 목록을 동적으로 생성하는 데 사용됩니다.

-   **반환값**: `Promise<ActionDefinition[]>`
-   **동작 원리**: 내부적으로 `ActionRegistry`의 `getActions` 메소드를 호출하여 최신 액션 목록을 가져옵니다.

#### `ActionDefinition` 인터페이스

각 액션의 구조를 정의합니다.

```typescript
interface ActionDefinition {
  name: string; // 액션의 고유 이름 (예: "playAnimation")
  description: string; // 액션에 대한 설명
  params: ActionParam[]; // 액션이 필요로 하는 파라미터 목록
}
```

#### `ActionParam` 인터페이스

액션이 받는 각 파라미터의 타입과 속성을 정의합니다. 이 정보를 사용하여 UI에서 적절한 입력 필드(텍스트 박스, 체크박스, 드롭다운 등)를 동적으로 생성할 수 있습니다.

```typescript
interface ActionParam {
  name: string; // 파라미터 이름 (예: "animationName")
  type: 'string' | 'number' | 'boolean' | 'enum'; // 파라미터 타입
  description: string; // 파라미터에 대한 설명
  defaultValue?: any; // 기본값
  options?: string[]; // type이 'enum'일 경우, 선택 가능한 옵션 목록
}
```

**예시:**
`TriggerEditorPanel.tsx`는 이 API를 호출하여 다음과 같이 동적으로 UI를 구성합니다.
1. `getAvailableActions()`를 호출하여 모든 `ActionDefinition`을 가져옵니다.
2. 액션의 `name`과 `description`을 사용하여 드롭다운 목록을 채웁니다.
3. 사용자가 특정 액션을 선택하면, 해당 액션의 `params` 배열을 순회합니다.
4. 각 `ActionParam`의 `type`에 따라 텍스트 입력, 숫자 입력, 체크박스, 선택 목록 등의 UI 컴포넌트를 동적으로 렌더링합니다.

---

### `playAnimation(animationName, loop, crossFadeDuration)`

캐릭터에게 특정 애니메이션을 재생하도록 지시합니다. 이 함수는 `userdata/animations` 폴더와 `assets/Animation` 폴더에서 순서대로 파일을 검색합니다.

-   **`animationName`** (`string`): 재생할 애니메이션 파일의 이름. (예: `MyJump.vrma`, `Idle.fbx`) **경로 접두사 없이 파일 이름만 전달해야 합니다.**
-   **`loop`** (`boolean`, Optional, Default: `false`): 애니메이션 반복 여부.
-   **`crossFadeDuration`** (`number`, Optional, Default: `0.5`): 이전 애니메이션과의 교차 페이드 시간(초).

**예시:**
```typescript
// userdata/animations/Jump.vrma 또는 assets/Animation/Jump.vrma 재생
actions.playAnimation('Jump.vrma', false);
```

---

### `setExpression(expressionName, weight, duration)`

캐릭터의 표정을 부드럽게 애니메이션하며 변경합니다.

-   **`expressionName`** (`string`): VRM 모델에 포함된 표정의 이름. (예: `happy`, `sad`, `angry`)
-   **`weight`** (`number`): 표정의 목표 강도 (0.0 ~ 1.0).
-   **`duration`** (`number`, Optional, Default: `0.1`): 목표 강도에 도달하기까지 걸리는 시간(초).

**예시:**
```typescript
// 0.5초에 걸쳐 행복한 표정을 짓게 함
actions.setExpression('happy', 1.0, 0.5);
```

---

### `setExpressionWeight(expressionName, weight)`

캐릭터 표정의 가중치를 즉시 설정합니다. 애니메이션 없이 바로 적용됩니다.

-   **`expressionName`** (`string`): VRM 모델에 포함된 표정의 이름.
-   **`weight`** (`number`): 표정의 강도 (0.0 ~ 1.0).

**예시:**
```typescript
// 'angry' 표정의 강도를 0.8로 즉시 설정
actions.setExpressionWeight('angry', 0.8);
```

---

### `setPose(poseName)`

캐릭터에게 특정 포즈를 적용합니다. 이 함수는 `userdata/poses` 폴더와 `assets/Pose` 폴더에서 순서대로 파일을 검색합니다.

-   **`poseName`** (`string`): 적용할 포즈 파일의 이름. (예: `T-Pose.vrma`) **경로 접두사 없이 파일 이름만 전달해야 합니다.**

**예시:**
```typescript
actions.setPose('Stand_01.vrma');
```

---

### `playTTS(text)`

TTS(Text-to-Speech)를 사용하여 문장을 재생합니다.

-   **`text`** (`string`): 재생할 내용.

**예시:**
```typescript
actions.playTTS("안녕하세요! 만나서 반가워요.");
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

화면에 채팅 메시지를 표시합니다. `playTTS`와 달리 음성은 나오지 않습니다.

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

### `setHitboxesVisible(visible)`

VRM 모델의 히트박스 가시성을 설정합니다. 디버깅이나 특정 상호작용 개발에 유용합니다.

-   **`visible`** (`boolean`): 히트박스를 표시할지 여부.

**예시:**
```typescript
// 히트박스 보이기
actions.setHitboxesVisible(true);
```

---

### `resetPose()`

캐릭터의 포즈를 기본 T-Pose로 초기화합니다.

---

### `saveCurrentPose()`

현재 캐릭터의 포즈를 파일로 저장하도록 다이얼로그를 엽니다.

---

### `loadCharacter(fileName)`

지정된 파일 이름의 VRM 모델을 로드하여 캐릭터를 교체합니다.

-   **`fileName`** (`string`): `userdata/vrm` 또는 `assets/VRM` 폴더에 있는 VRM 파일의 이름.

---

### `setCameraMode(mode)`

카메라 모드를 변경합니다.

-   **`mode`** (`'orbit' | 'fixed'`): `'orbit'` (자유 시점) 또는 `'fixed'` (고정 시점).

---

### `setContext(key, value)`

모든 플러그인과 모드가 공유하는 전역 키-값(Key-Value) 저장소에 데이터를 저장합니다. 이 데이터는 애플리케이션이 실행되는 동안 유지됩니다.

-   **`key`** (`string`): 데이터를 저장할 고유한 키.
-   **`value`** (`string` | `number` | `boolean`): 저장할 값. 복잡한 객체 대신 간단한 타입을 사용하는 것을 권장합니다.

**예시:**
```typescript
// 현재 게임의 난이도를 'easy'로 설정
actions.setContext('gameDifficulty', 'easy');
```

---

### `getContext(key)`

전역 키-값 저장소에서 데이터를 가져옵니다. 이 함수는 비동기로 작동하며 `Promise`를 반환합니다.

-   **`key`** (`string`): 가져올 데이터의 키.
-   **반환값**: `Promise<any>` - 키에 해당하는 값.

**예시:**
```typescript
// 현재 게임 난이도를 가져와서 출력
const difficulty = await actions.getContext('gameDifficulty');
console.log(difficulty); // 'easy'
```

---

## 3. 경로 API (`window.electronAPI`)

렌더러 프로세스에서 `assets` 또는 `userdata` 폴더의 절대 경로를 안전하게 얻기 위한 API입니다. 파일 목록을 가져오거나 특정 파일의 경로를 해석하는 데 사용됩니다.

### `resolvePath(pathName, subpath)`
- **설명**: `assets` 또는 `userdata` 폴더 내의 상대 경로를 기반으로 전체 절대 경로를 반환합니다.
- **`pathName`** (`'assets' | 'userData'`): 기준이 될 폴더를 지정합니다.
- **`subpath`** (`string`): 기준 폴더로부터의 상대 경로 (예: `vrm/MyModel.vrm`).
- **반환값**: `Promise<string>` (절대 경로)

### `listDirectory(dirPath, basePath)`
- **설명**: 지정된 폴더 내의 파일 및 하위 디렉토리 목록을 반환합니다.
- **`dirPath`** (`string`): 목록을 가져올 디렉토리의 상대 경로.
- **`basePath`** (`'assets' | 'userData'`, Optional, Default: `'assets'`): `dirPath`의 기준이 될 폴더를 지정합니다.
- **반환값**: `Promise<{ files: string[], directories: string[], error?: string }>`

**예시:**
```typescript
// userdata/mods 폴더의 파일 및 폴더 목록 가져오기
const mods = await window.electronAPI.listDirectory('mods', 'userData');

// assets/Animation/Jump.vrma 파일의 절대 경로 가져오기
const jumpPath = await window.electronAPI.resolvePath('assets', 'Animation/Jump.vrma');
```

---

## 5. EventBus API (`context.eventBus`)

`EventBus`는 시스템의 여러 부분(UI, 플러그인, 코어 시스템)이 서로 직접적인 의존성 없이 통신할 수 있게 해주는 발행/구독 시스템입니다. `pluginContext.eventBus` 또는 `import eventBus from '../core/event-bus'`를 통해 접근할 수 있습니다.

### 주요 이벤트 목록

#### `ui:editModeToggled`
-   **설명**: 사용자가 UI를 통해 '편집 모드'를 켜거나 끌 때 발행됩니다.
-   **데이터**: `{ isEditMode: boolean }`
-   **주요 발행자**: `Sidebar.tsx`
-   **주요 구독자**: `EditMenu.tsx`, `VRMCanvas.tsx`

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

#### `llm:responseReceived`
-   **설명**: `ChatService`가 LLM으로부터 응답을 받아 처리를 완료했을 때 발행됩니다.
-   **데이터**: `{ text: string, expression: string }`
-   **주요 구독자**: `LlmResponseHandlerPlugin`

#### `vrm:animationFinished`
-   **설명**: 반복되지 않는 애니메이션의 재생이 완료되었을 때 발행됩니다.
-   **데이터**: `{ clipName: string }`

#### `vrm:poseApplied`
-   **설명**: 캐릭터에 새로운 포즈가 적용되었을 때 발행됩니다.
-   **데이터**: `{ poseName: string }`

#### `plugin:enabled` / `plugin:disabled`
-   **설명**: 플러그인이 활성화되거나 비활성화될 때 발행됩니다.
-   **데이터**: `{ pluginName: string }`

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

---

## 6. Trigger API (`context.registerTrigger`)

`Trigger`는 **"어떤 조건이 충족되었을 때, 특정 행동을 실행"**하는 로직을 선언적으로 등록하는 시스템입니다. 복잡한 상호작용을 모듈화하고 재사용 가능하게 만드는 데 사용됩니다.

### `registerTrigger(trigger)`

-   **`trigger`** (`{ condition: () => boolean, action: () => void }`): `condition`과 `action` 함수를 포함하는 객체입니다.
    -   **`condition`**: 매 프레임 또는 주기적으로 평가될 조건 함수. `true`를 반환하면 `action`이 실행됩니다.
    -   **`action`**: `condition`이 `true`를 반환했을 때 실행될 함수.

**예시:**
```typescript
// 30초마다 "안녕하세요"라고 말하는 Trigger
context.registerTrigger({
  // Condition: 마지막으로 말한 시간으로부터 30초가 지났는가?
  condition: () => Date.now() - context.characterState.lastSpokenTimestamp > 30000,
  // Action: 말하고, 마지막으로 말한 시간을 업데이트한다.
  action: () => {
    context.actions.playTTS("안녕하세요!");
    context.characterState.lastSpokenTimestamp = Date.now();
  }
});
```

---

## 7. SystemControls API (`context.system`)

`SystemControls`는 애플리케이션의 시스템 레벨 설정을 제어하는 인터페이스입니다. `Actions`가 캐릭터의 '행동'을 다룬다면, `SystemControls`는 TTS나 볼륨과 같은 시스템의 '상태'나 '설정'을 변경하는 데 사용됩니다.

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

### `toggleMouseIgnore()`

마우스 클릭 통과(Click-Through) 기능을 켜고 끕니다. `Ctrl+Shift+O` 단축키와 동일한 기능을 수행합니다.

**예시:**
```typescript
// 마우스 클릭 통과 모드 전환
context.system.toggleMouseIgnore();
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
