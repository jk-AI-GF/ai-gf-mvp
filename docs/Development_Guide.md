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

### 4.1. 새로운 액션(Action) 추가 가이드 (신규 아키텍처)

`ActionRegistry`가 도입되면서 새로운 액션을 추가하는 과정이 매우 간단해졌습니다. 더 이상 여러 파일을 오가며 인터페이스, 구현, IPC 프록시를 수동으로 추가할 필요가 없습니다.

**이제 새로운 액션을 추가하려면 `src/core/action-registrar.ts` 파일 하나만 수정하면 됩니다.**

**예시: 캐릭터의 투명도를 조절하는 `setOpacity(opacity)` 액션 추가하기**

#### 1단계: `action-registrar.ts`에 액션 등록하기

`src/core/action-registrar.ts` 파일을 열고, `registerCoreActions` 함수 내부에 있는 `actionRegistry.register()` 호출 목록에 새로운 액션을 추가합니다.

```typescript
// src/core/action-registrar.ts

import { ActionRegistry } from './action-registry';
import { PluginContext } from '../plugin-api/plugin-context';
// ... 다른 import들

export function registerCoreActions(
  actionRegistry: ActionRegistry,
  context: () => PluginContext
) {
  // ... 기존에 등록된 다른 액션들
  
  actionRegistry.register({
    // 1. 액션의 고유 이름 (API 호출 시 사용)
    name: 'setOpacity',
    // 2. 액션에 대한 설명 (UI 툴팁 등에 사용)
    description: '캐릭터의 투명도를 조절합니다.',
    // 3. 액션이 받을 파라미터 정의 (UI 폼 자동 생성에 사용)
    params: [
      {
        name: 'opacity',
        type: 'number',
        description: '투명도 (0.0 ~ 1.0)',
        defaultValue: 1.0,
      },
    ],
    // 4. 액션의 실제 실행 로직
    execute: (ctx, params) => {
      const vrmManager = ctx.vrmManager;
      if (vrmManager?.currentVrm) {
        const opacity = params.opacity as number;
        
        // Three.js 메쉬 순회하며 투명도 설정
        vrmManager.currentVrm.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            // 모든 재질을 순회하며 투명도 관련 속성 설정
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(material => {
              material.transparent = opacity < 1.0;
              material.opacity = opacity;
              material.needsUpdate = true;
            });
          }
        });
      }
    },
  });

  // ... 다른 액션 등록 계속
}
```

이것으로 작업은 끝입니다.

`action-registrar.ts`에 액션을 등록하면, 시스템이 나머지 모든 것을 자동으로 처리합니다.

-   **`PluginContext`에 자동 추가**: `context-factory.ts`가 `ActionRegistry`를 읽어 `pluginContext.actions.setOpacity` 함수를 동적으로 생성합니다.
-   **IPC 프록시 자동 생성**: `mod-loader.ts`가 렌더러로부터 액션 명세를 받아 메인 프로세스 모드(Mod)가 `setOpacity`를 호출할 수 있도록 IPC 프록시를 자동으로 만듭니다.
-   **UI에 자동 반영**: 시퀀스 에디터와 같은 UI 컴포넌트가 `getAvailableActions` API를 호출하면, 방금 등록한 `setOpacity` 액션의 정보(`description`, `params` 등)가 동적으로 포함되어 사용자에게 보여집니다.

이 새로운 아키텍처는 개발 생산성을 극대화하고, 실수를 줄이며, 프로젝트의 확장성을 크게 향상시킵니다.

## 5. 고급: 씬(Scene) 객체의 전역 관리

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

## 6. 데이터 영속성 및 설정 관리 (electron-store)

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

## 7. 자동화된 테스트 (Automated Testing)

프로젝트의 안정성과 유지보수성을 높이기 위해, 우리는 `Jest`와 `React Testing Library`를 사용한 자동화된 테스트를 도입했습니다. 새로운 기능을 추가하거나 기존 코드를 리팩토링할 때는 반드시 관련 테스트 코드를 작성하거나 수정하는 것을 원칙으로 합니다.

### 테스트 실행 방법

프로젝트의 모든 테스트를 실행하려면, 다음 명령어를 사용하세요.

```bash
npm test
```

Jest는 `*.test.ts(x)` 또는 `*.spec.ts(x)` 패턴을 가진 모든 파일을 찾아 테스트를 실행합니다.

### 테스트 작성 가이드

-   **파일 위치**: 테스트 파일은 테스트하려는 대상 파일과 같은 디렉토리에 위치시키는 것을 원칙으로 합니다. 예를 들어, `src/core/action-registry.ts`의 테스트 파일은 `src/core/action-registry.test.ts`입니다.
-   **단위 테스트**: 특정 함수나 클래스의 기능이 독립적으로 올바르게 작동하는지 검증합니다. 의존성이 있는 다른 모듈은 `jest.fn()` 등을 사용하여 모킹(mocking)해야 합니다.
-   **컴포넌트 테스트**: React 컴포넌트가 주어진 `props`에 따라 올바르게 렌더링되고, 사용자의 상호작용(클릭, 입력 등)에 예상대로 반응하는지 검증합니다. `@testing-library/react`의 `render`, `screen`, `fireEvent` 등의 유틸리티를 사용합니다.

### 테스트 작성 예시 (`ActionRegistry` 단위 테스트)

다음은 `src/core/action-registry.test.ts`의 일부로, `ActionRegistry` 클래스의 핵심 기능을 검증하는 단위 테스트의 예시입니다.

```typescript
// src/core/action-registry.test.ts

import { ActionRegistry } from './action-registry';
import { PluginContext } from '../plugin-api/plugin-context';
import { ActionDefinition, ActionImplementation } from '../plugin-api/actions';

describe('ActionRegistry', () => {
  let actionRegistry: ActionRegistry;
  let mockContext: PluginContext;

  beforeEach(() => {
    actionRegistry = new ActionRegistry();
    mockContext = { /* ... 모킹된 컨텍스트 ... */ } as any;
  });

  test('should register an action', () => {
    const mockDefinition: ActionDefinition = {
      name: 'testAction',
      description: 'A test action',
      params: [],
    };
    const mockImplementation: ActionImplementation = jest.fn();

    actionRegistry.register(mockDefinition, mockImplementation);

    const actions = actionRegistry.getAllActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].definition.name).toBe('testAction');
  });

  test('should execute a registered action', () => {
    const mockExecute = jest.fn();
    const mockDefinition: ActionDefinition = { /* ... */ };

    actionRegistry.register(mockDefinition, mockExecute);

    const actionToExecute = actionRegistry.get('executableAction');
    actionToExecute?.implementation(mockContext, {});

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
```