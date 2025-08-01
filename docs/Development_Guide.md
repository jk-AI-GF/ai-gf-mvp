# AI-GF MVP 개발 가이드

이 문서는 AI-GF MVP 프로젝트의 아키텍처를 이해하고, 새로운 기능을 추가하는 방법을 안내합니다.

## 1. 개요 (Overview)

이 프로젝트는 다음과 같은 핵심 철학을 기반으로 구축되었습니다.

-   **React 중심 아키텍처**: 모든 UI와 3D 렌더링 로직은 React 컴포넌트 기반으로 관리됩니다. 이를 통해 코드를 선언적이고 재사용 가능하게 만듭니다.
-   **중앙 집중식 상태 관리**: `React Context API`를 사용하여 애플리케이션의 핵심 관리자(VRM, 플러그인 등)를 중앙에서 관리합니다. 이를 통해 `window` 전역 객체 의존성을 제거하고 상태 접근을 예측 가능하게 만듭니다.
-   **이벤트 기반 통신**: 모듈 간의 직접적인 의존성을 줄이기 위해 `EventBus`를 사용하여 컴포넌트들이 서로 통신합니다.

## 2. 핵심 아키텍처 (Core Architecture)

### `AppContext` (in `src/renderer/contexts/AppContext.tsx`)

`AppContext`는 애플리케이션의 두뇌와 같습니다. `useAppContext` 훅을 통해 어떤 컴포넌트에서든 다음과 같은 핵심 인스턴스에 접근할 수 있습니다.

-   `vrmManager`: VRM 모델의 로딩, 애니메이션, 표정 등 3D 캐릭터를 직접 제어합니다.
-   `pluginManager`: 모든 플러그인을 등록하고 생명주기를 관리합니다. 플러그인을 통해 캐릭터에 자율적인 행동을 부여할 수 있습니다.
-   `chatService`: LLM API와의 통신 및 채팅 기록을 관리합니다.

### 에셋 및 사용자 데이터 관리 (Asset and User Data Management)

이 프로젝트는 리소스를 두 종류로 명확히 구분하여 관리합니다. 이 둘의 차이를 이해하는 것은 개발에 매우 중요합니다.

-   **`assets` 폴더**: **애플리케이션의 핵심 리소스**가 위치합니다.
    -   **역할**: 앱 아이콘, 기본 제공 애니메이션/포즈 등 앱의 기본 작동에 필수적인, 개발자가 제공하는 파일들을 관리합니다.
    -   **특징**: 사용자가 직접 수정하는 것을 권장하지 않으며, 앱과 함께 패키징되어 배포됩니다.

-   **`userdata` 폴더**: **사용자가 직접 추가하고 관리하는 모든 리소스**가 위치합니다.
    -   **역할**: 사용자가 다운로드한 VRM 모델, 직접 만든 포즈, 커스텀 애니메이션, 모드 등을 저장합니다.
    -   **위치**:
        -   **개발 환경**: 프로젝트 루트의 `userdata/` 폴더
        -   **배포 환경**: `C:\Users\<사용자>\AppData\Roaming\<앱이름>` 과 같이 운영체제가 지정한 안전한 경로. 이를 통해 **앱을 업데이트해도 사용자의 데이터가 삭제되지 않습니다.**
    -   **특징**: 앱이 시작될 때 `vrm`, `poses`, `animations`, `mods`, `persona` 와 같은 하위 폴더들이 자동으로 생성됩니다. UI 컴포넌트(예: `AnimationPanel`)는 `userdata`와 `assets` 양쪽의 리소스 목록을 모두 불러와 사용자에게 통합된 목록을 보여주는 것을 목표로 해야 합니다.

이러한 구조 덕분에, 개발 환경과 배포 환경의 경로 차이가 코드 수준에서 완벽하게 추상화되어, 개발자는 경로 걱정 없이 로직에만 집중할 수 있습니다.

### 경로 처리 시스템 (`path-utils.ts` & `preload.ts`)

모든 경로 관련 로직은 메인 프로세스의 `src/main/path-utils.ts`에 중앙화되어 있습니다. 이 유틸리티 함수들은 `preload.ts`를 통해 `window.electronAPI.resolvePath(base, subpath)` 와 같은 안전한 API 형태로 렌더러 프로세스에 노출됩니다. 이를 통해 렌더러는 파일 시스템에 직접 접근하지 않고도 필요한 리소스의 절대 경로를 얻을 수 있습니다.

### 렌더링 파이프라인 (Rendering Pipeline)

3D 씬 렌더링은 다음과 같은 컴포넌트들의 계층 구조로 이루어집니다.

1.  **`Scene.tsx`**: 가장 낮은 레벨의 컴포넌트로, 순수한 Three.js의 `Scene`, `Camera`, `Light` 등 3D 세계의 정적인 뼈대를 생성하고 렌더링을 위한 캔버스를 준비합니다.
2.  **`VRMCanvas.tsx`**: `Scene` 컴포넌트 위에서 동작합니다. `VRMManager`와 `PluginManager`를 초기화하고, VRM 모델을 씬에 로드하며, 매 프레임마다 애니메이션 루프(`requestAnimationFrame`)를 실행하여 캐릭터와 플러그인을 업데이트하는 동적인 로직을 담당합니다.
3.  **`App.tsx`**: `VRMCanvas`를 포함하여 애플리케이션의 모든 2D UI 컴포넌트(메뉴, 패널, 채팅창 등)를 배치하는 최상위 레이아웃 역할을 합니다.

### `EventBus` (in `src/core/event-bus.ts`)

`EventBus`는 컴포넌트 간의 통신을 위한 발행/구독(Pub/Sub) 시스템입니다. 한 컴포넌트가 다른 컴포넌트를 직접 참조하지 않고도 상호작용할 수 있게 해줍니다.

-   **발행(Emit)**: `eventBus.emit('eventName', data)`
-   **구독(Subscribe)**: `eventBus.on('eventName', (data) => { ... })`

예를 들어, 채팅 메시지가 도착하면 `ChatService`는 `chat:newMessage` 이벤트를 발생시키고, `Chat.tsx`와 `FloatingMessageManager.tsx`는 이 이벤트를 구독하여 각각 UI를 업데이트합니다.

### 플러그인 시스템: 아키텍처의 핵심

플러그인 시스템은 캐릭터에게 자율성을 부여하고 모딩(Modding) 생태계를 가능하게 하는 가장 중요한 아키텍처입니다.

#### Core Plugin과 User Mod의 동등성

이 프로젝트의 핵심 철학은 **"코어 개발팀이 만드는 기능과 사용자가 만드는 모드는 기술적으로 동등하다"**는 것입니다.

-   **Core Plugin** (`src/plugins`): 자동 눈 깜빡임, 자동 고개 돌리기 등 애플리케이션에 기본적으로 포함된 기능입니다.
-   **User Mod** (`userdata/mods`): 사용자가 추가하는 커스텀 기능입니다.

이 둘은 모두 동일한 `Plugin` 인터페이스를 구현하며, 동일한 `PluginContext`를 통해 시스템과 상호작용합니다. 즉, **Core Plugin이 할 수 있는 모든 것은 User Mod도 할 수 있으며, 그 반대도 마찬가지입니다.** 이 아키텍처적 평등함은 "우리가 기능을 넣으면 안 된다"는 기획 의도를 코드로 구현한 결과물이며, 모더에게 강력한 권한과 창작의 자유를 부여합니다.

#### `PluginManager`와 `PluginContext`

-   **`PluginManager`**: 모든 플러그인(Core Plugin, User Mod 모두)을 등록하고, 매 프레임 `update` 메서드를 호출하여 플러그인이 동작하도록 관리합니다.
-   **`PluginContext`**: 플러그인이 코어 기능에 안전하게 접근할 수 있도록 제공되는 **통합 API 집합**입니다. 플러그인은 이 Context를 통해 시스템과 소통하며, 다음과 같은 주요 인터페이스를 포함합니다.
    -   `actions`: 캐릭터 행동, UI, 환경 등을 제어하는 명령 (자세한 내용은 `API_Reference.md` 참고)
    -   `system`: TTS, 볼륨 등 시스템 설정을 제어하는 명령
    -   `eventBus`: 다른 플러그인이나 UI와 소통하는 메시지 버스
    -   `registerTrigger`: 특정 조건에서 코드를 실행시키는 트리거 등록
    -   `characterState`: 캐릭터의 감정, 마지막 대화 시간 등 공유 상태 정보

이 구조를 통해 모든 플러그인은 격리된 상태에서, 표준화된 `PluginContext` API만을 사용하여 안전하게 시스템의 강력한 기능들을 활용할 수 있습니다.

## 3. 주요 인터페이스 (Key Interfaces)

플러그인이든 UI 컴포넌트든, 캐릭터와 상호작용할 때는 다음의 표준화된 인터페이스를 사용하는 것이 권장됩니다.

-   **`pluginManager.context.actions`**: 로직을 제어하는 가장 표준적인 방법입니다. `playAnimation`, `setExpression`, `playTTS`, `lookAt` 등의 함수를 제공합니다.
-   **`pluginManager.context.system`**: TTS 토글, 마스터 볼륨 조절 등 시스템 레벨의 기능을 제어합니다.

## 4. 기능 추가 가이드 (How to Add a New Feature)

**예시: 캐릭터를 점프시키는 `JumpButton` 컴포넌트 만들기**

### 1단계: React 컴포넌트 생성

`src/renderer/components/JumpButton.tsx` 파일을 새로 만듭니다.

### 2단계: `useAppContext`로 `pluginManager`에 접근

`useAppContext` 훅을 사용하여 `pluginManager` 인스턴스를 가져옵니다.

### 3단계: `actions` 인터페이스를 사용하여 캐릭터 제어

`pluginManager.context.actions` 객체에 있는 `playAnimation` 함수를 호출하여 점프 애니메이션을 실행합니다. (애니메이션 파일은 `assets/Animation` 폴더에 있다고 가정합니다.)

```tsx
// src/renderer/components/JumpButton.tsx

import React from 'react';
import { useAppContext } from '../contexts/AppContext';

const JumpButton: React.FC = () => {
  // AppContext에서 pluginManager를 가져옵니다.
  const { pluginManager } = useAppContext();

  const handleJump = () => {
    // pluginManager가 초기화되었는지 확인합니다.
    if (!pluginManager) {
      console.error('PluginManager is not initialized yet.');
      return;
    }

    // 표준 Actions 인터페이스를 통해 애니메이션을 재생합니다.
    // 첫 번째 인자: 애니메이션 파일 이름 (vrma, fbx 등)
    // 두 번째 인자: 반복 여부 (loop)
    pluginManager.context.actions.playAnimation('Jump.vrma', false);
  };

  return (
    <button 
      onClick={handleJump} 
      style={{ position: 'fixed', bottom: '20px', right: '200px', zIndex: 100 }}
    >
      Jump!
    </button>
  );
};

export default JumpButton;
```

### 4단계: `App.tsx`에 새 컴포넌트 통합

`App.tsx` 파일에 방금 만든 `JumpButton` 컴포넌트를 추가하여 UI에 표시되도록 합니다.

```tsx
// src/renderer/App.tsx

import React from 'react';
// ... 다른 import들
import JumpButton from './components/JumpButton'; // JumpButton 임포트

const App: React.FC = () => {
  // ... 기존 코드
  
  return (
    <div>
      {/* ... 기존 컴포넌트들 */}
      <Chat messages={chatMessages} onSendMessage={handleSendMessage} />
      <CameraControl />
      <FloatingMessageManager />

      {/* 새로 추가한 컴포넌트 */}
      <JumpButton />
    </div>
  );
};

export default App;
```

이제 애플리케이션을 실행하면 화면에 "Jump!" 버튼이 나타나고, 버튼을 클릭하면 캐릭터가 점프 애니메이션을 재생할 것입니다.

## 5. 고급: Trigger 시스템 활용하기

Trigger 시스템은 **"어떤 조건이 충족되었을 때, 특정 행동을 실행"**하는 로직을 만들 때 사용되는 강력한 아키텍처입니다. 이는 프로젝트의 핵심 목표인 **모딩(Modding) 생태계**를 구축하는 데 매우 중요한 역할을 합니다.

### 왜 Trigger를 사용하는가?

단순히 매 프레임마다 실행되는 `update` 로직과 달리, Trigger는 **'조건'과 '행동'을 분리**합니다. 이를 통해 모더(Modder)들은 복잡한 상태 관리 없이, 선언적으로 "이런 상황이 되면, 이걸 해줘"라고 시스템에 등록할 수 있습니다.

-   **관심사 분리**: "언제" 행동할 것인지(조건)와 "무엇을" 할 것인지(행동)의 로직이 분리되어 코드가 명확해집니다.
-   **재사용성 및 확장성**: 한번 만들어진 Trigger 조건은 여러 다른 플러그인에서 재사용될 수 있습니다. 예를 들어 '사용자가 1분간 입력이 없는 조건'을 감지하는 Trigger가 있다면, 한 플러그인은 이를 이용해 캐릭터가 하품하게 만들고, 다른 플러그인은 "지루하신가요?"라고 말을 걸게 만들 수 있습니다.
-   **성능**: 모든 조건 검사를 중앙의 `TriggerEngine`에서 관리하므로, 향후 전체적인 성능 최적화에 유리합니다.

### Trigger의 구조

Trigger는 두 가지 핵심 요소로 구성된 객체입니다.

1.  `condition`: `() => boolean` 형태의 함수. `true`를 반환하면 Trigger가 발동됩니다.
2.  `action`: `() => void` 형태의 함수. `condition`이 `true`가 되었을 때 실행될 로직입니다.

### 사용 방법

플러그인의 `setup` 메서드에서 `pluginContext.registerTrigger`를 호출하여 등록합니다.

```typescript
// 예시: ProactiveDialoguePlugin의 일부

import { Plugin, PluginContext } from '../plugin-api/plugin-context';

export class ProactiveDialoguePlugin implements Plugin {
  // ... (생략)

  setup(context: PluginContext): void {
    this.context = context;
    const thirtySeconds = 30 * 1000;

    // Trigger 등록
    context.registerTrigger({
      // Condition: 마지막 대화 후 30초가 지났는가?
      condition: () => {
        const lastSpoken = this.context.characterState.lastSpokenTimestamp;
        const now = Date.now();
        return now - lastSpoken > thirtySeconds;
      },
      // Action: 자발적인 대화를 시작한다.
      action: () => {
        this.context.actions.playTTS("무슨 생각 하세요?");
        // Action이 실행되면, 다시 조건을 만족하지 않도록 상태를 업데이트해야 함
        this.context.characterState.lastSpokenTimestamp = Date.now();
      }
    });
  }

  // ... (생략)
}
```

이처럼 Trigger 시스템은 복잡한 상호작용을 모듈화하고 재사용 가능하게 만드는 핵심적인 도구입니다. 새로운 기능을 만들 때, "매 프레임마다 실행되어야 하는가?" 아니면 "특정 조건에서 한 번 실행되어야 하는가?"를 고민하고, 후자라면 Trigger 시스템을 적극적으로 활용하는 것을 권장합니다.

## 6. 고급: 씬(Scene) 객체의 전역 관리

때로는 `Scene.tsx`에서 생성된 특정 3D 객체(예: 조명)를 다른 UI 컴포넌트(예: `LightPanel`)에서 직접 제어하고 싶을 수 있습니다. 이 프로젝트는 `AppContext`를 통해 이러한 종류의 전역 상태 관리를 지원합니다.

### 왜 필요한가?

`Scene.tsx`는 3D 세계의 뼈대를 만드는 역할에만 집중합니다. 만약 조명 제어 로직까지 이 파일에 넣는다면, `Scene.tsx`의 책임이 너무 많아져 코드가 복잡해집니다. UI 컴포넌트는 UI 로직만 담당하고, 3D 씬 생성은 씬 생성 로직만 담당하도록 역할을 분리하는 것이 좋습니다.

### 구현 절차

**예시: `LightPanel`에서 씬의 조명을 제어하는 기능 구현하기**

#### 1단계: `AppContext.tsx`에 상태 추가

제어하려는 객체(예: `DirectionalLight`)와 그 객체를 설정하는 함수를 `AppContextType` 인터페이스와 `AppProvider`의 `value`에 추가합니다.

```typescript
// src/renderer/contexts/AppContext.tsx

// ... import
import * as THREE from 'three';

interface AppContextType {
  // ... 기존 속성들
  directionalLight: THREE.DirectionalLight | null;
  setDirectionalLight: (light: THREE.DirectionalLight) => void;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ... 기존 state들
  const [directionalLight, setDirectionalLight] = useState<THREE.DirectionalLight | null>(null);

  const value = {
    // ... 기존 value들
    directionalLight,
    setDirectionalLight,
  };

  return <AppContext.Provider value={value}>{/* ... */}</AppContext.Provider>;
};
```

#### 2단계: `Scene.tsx`에서 전역 상태 설정

`Scene.tsx`에서 조명 객체를 생성한 직후, `useAppContext`를 통해 가져온 `setDirectionalLight` 함수를 호출하여 생성된 인스턴스를 전역 상태에 등록합니다.

```typescript
// src/renderer/components/scene/Scene.tsx

// ... import
import { useAppContext } from '../../contexts/AppContext';

const Scene: React.FC<SceneProps> = ({ onLoad }) => {
  const { setDirectionalLight } = useAppContext();

  useEffect(() => {
    // ... 씬 설정 코드
    
    // 조명 생성
    const light = new THREE.DirectionalLight(0xffffff, 2);
    scene.add(light);
    
    // 생성된 조명 인스턴스를 전역 상태에 등록
    setDirectionalLight(light);

    // ... 나머지 코드
  }, [onLoad, setDirectionalLight]);

  return <div ref={mountRef} />;
};
```

#### 3단계: UI 컴포넌트에서 전역 상태 사용

이제 어떤 컴포넌트에서든 `useAppContext`를 통해 `directionalLight` 객체에 접근하여 그 속성을 직접 제어할 수 있습니다.

```tsx
// src/renderer/components/LightPanel.tsx

// ... import
import { useAppContext } from '../contexts/AppContext';

const LightPanel: React.FC<LightPanelProps> = ({ onClose }) => {
  const { directionalLight } = useAppContext();

  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIntensity = parseFloat(e.target.value);
    if (directionalLight) {
      directionalLight.intensity = newIntensity;
    }
  };

  return (
    <Panel title="조명 편집" onClose={onClose}>
      <input type="range" onChange={handleIntensityChange} />
    </Panel>
  );
};
```

이 패턴을 사용하면, 3D 객체의 생성과 제어 로직을 명확하게 분리하여 프로젝트의 유지보수성과 확장성을 크게 향상시킬 수 있습니다.

## 7. 데이터 영속성 및 설정 관리 (electron-store)

애플리케이션을 재시작해도 유지되어야 하는 모든 데이터(예: API 키, 창 투명도 등)는 `electron-store`를 사용하여 관리합니다.

### 핵심 원칙: 메인 프로세스 중앙 관리

이 프로젝트의 중요한 아키텍처 원칙은 **"저장 요청은 어디서든 할 수 있지만, 실제 저장은 오직 메인 프로세스만 담당한다"** 는 것입니다.

렌더러 프로세스(React 컴포넌트 등)가 `electron-store`에 직접 접근하여 파일을 수정하는 것은 금지됩니다. 이는 데이터의 일관성을 보장하고, 파일 시스템 접근을 메인 프로세스로 제한하여 보안을 강화하기 위함입니다.

### 데이터 저장 흐름

데이터 저장은 항상 다음의 4단계를 거칩니다.

1.  **UI (렌더러 프로세스)**: 사용자가 설정을 변경하면(예: `SettingsModal`에서 입력), `AppContext`를 통해 `window.electronAPI`의 함수를 호출합니다.
2.  **IPC (통신 계층)**: `preload.ts`에 정의된 이 함수는 `ipcRenderer.send` 또는 `ipcRenderer.invoke`를 통해 메인 프로세스에 특정 채널로 데이터를 전송합니다.
3.  **요청 수신 (메인 프로세스)**: `src/main/index.ts`에서 `ipcMain.on` 또는 `ipcMain.handle`을 사용하여 UI로부터 온 요청을 수신합니다.
4.  **데이터 저장 (메인 프로세스)**: 메인 프로세스가 자신이 소유한 `store` 인스턴스의 `.set()` 메서드를 호출하여, 데이터를 `config.json` 파일에 안전하게 기록합니다.

이러한 중앙 집중식 구조를 반드시 따라야 합니다. 자세한 구현 예시는 `docs/Electron-Store_Usage.md` 문서를 참고하세요.

## 8. 고급: 사용자 정의 트리거 시스템 (Custom Triggers)

사용자 정의 트리거 시스템은 코딩 없이 UI를 통해 **"언제(When), 어떤 조건에서(If), 무엇을 할지(Then)"**를 직접 설정하여 캐릭터의 상호작용을 무한히 확장할 수 있게 해주는 강력한 기능입니다. 이 모든 로직은 `CustomTriggerPanel`을 통해 관리됩니다.

### 사용자 정의 트리거의 구조

사용자는 UI를 통해 다음과 같은 필드를 설정하여 하나의 트리거를 완성합니다.

-   **이름 (Name)**: 트리거를 식별하기 위한 이름입니다. (예: "인사하면 반갑게 맞아주기")
-   **실행 시점 (When)**: 트리거의 조건을 검사할 시점을 선택합니다.
    -   **`상태 변경 시 (주기적 확인)`**: `ContextStore`의 특정 값이 변경되었는지 계속 확인합니다. (현재 아키텍처 제약으로 미지원)
    -   **`특정 이벤트 발생 시`**: `chat:newMessage`와 같은 특정 이벤트가 발생했을 때만 조건을 검사합니다. **성능에 유리하며 현재 권장되는 방식입니다.**
-   **조건 (If)**: 액션을 실행하기 위해 만족해야 할 조건입니다. (조건을 설정하지 않으면 이벤트 발생 시 항상 액션이 실행됩니다.)
    -   **`컨텍스트 키`**: `ContextStore`에서 값을 가져올 키입니다. 이벤트 기반 트리거의 경우, 이벤트와 함께 전달되는 데이터 객체의 키를 사용할 수도 있습니다. (예: `chat:newMessage` 이벤트의 `text` 필드)
    -   **`연산자`**: `==`, `!=`, `>`, `<`, `exists` (값이 존재함), `not exists` (값이 존재하지 않음) 등 비교 연산자입니다.
    -   **`비교 값`**: 컨텍스트 키에서 가져온 값을 비교할 대상 값입니다.
-   **액션 (Then)**: 조건이 충족되었을 때 실행될 행동입니다.
    -   **`액션 선택`**: `playAnimation`, `playTTS` 등 `Actions API`에 등록된 모든 행동을 선택할 수 있습니다.
    -   **`파라미터`**: 선택한 행동에 필요한 인자들을 입력합니다. (예: `playTTS` 액션의 경우 재생할 내용)

### 사용 예시: "사랑해" 라고 말하면 하트 날리기

1.  `CustomTriggerPanel`에서 **"새 트리거 추가"** 버튼을 클릭합니다.
2.  **이름**: "사랑 고백에 답하기" 라고 입력합니다.
3.  **실행 시점**: **`특정 이벤트 발생 시`** 를 선택합니다.
4.  **이벤트 선택**: **`chat:newMessage`** 를 선택합니다.
5.  **조건 (If)**:
    -   **컨텍스트 키**: `text` (이벤트 데이터에 포함된 채팅 메시지)
    -   **연산자**: `==`
    -   **비교 값**: `사랑해`
6.  **액션 (Then)**:
    -   **액션 선택**: `playTTS`
    -   **파라미터**: `"저도 사랑해요."` 라고 입력합니다.
7.  **"저장"** 버튼을 클릭합니다.

이제 사용자가 채팅으로 "사랑해"를 입력하면, `chat:newMessage` 이벤트가 발생하고, 등록된 트리거가 이벤트 데이터의 `text` 필드가 "사랑해"와 일치하는지 검사합니다. 조건이 참이므로 `playTTS` 액션이 실행되어 캐릭터가 "저도 사랑해요."라고 말하게 됩니다.
