## Action 클래스 작동 방식 설명

`Action` 클래스는 모듈(및 외부 모드)이 게임의 핵심 기능과 안전하고 제어된 방식으로 상호작용할 수 있도록 하는 인터페이스입니다. 이는 모딩 생태계를 구축하고 코어 시스템을 보호하는 데 중요한 역할을 합니다.

### 1. `Actions` 인터페이스 정의 (`src/module-api/actions.ts`)

*   이 파일은 `Actions`라는 TypeScript 인터페이스를 정의합니다. 이 인터페이스는 모듈이 호출할 수 있는 게임 내 기능(예: `playAnimation`, `showMessage`, `setExpression`)의 목록을 선언합니다.
*   이는 모듈이 게임의 특정 기능에 접근할 수 있는 명확하고 통제된 API를 제공합니다.

### 2. `Actions` 구현 (`src/renderer/renderer.ts`)

*   `renderer.ts` 파일에서 `Actions` 인터페이스를 구현하는 실제 객체(`actions` 상수)가 생성됩니다.
*   이 구현체는 `playAnimation`, `showMessage`, `setExpression`과 같은 메서드를 포함하며, 각 메서드는 실제 Three.js 함수(`window.loadAnimationFile`, `window.appendMessage`, `window.animateExpression`)를 호출합니다.
*   이 파일은 또한 메인 프로세스에서 보낸 IPC 메시지를 수신하고, 해당 메시지에 따라 `actions` 객체의 적절한 메서드를 호출하는 리스너를 설정합니다.

### 3. `ModuleContext`에 `Actions` 통합 (`src/module-api/module-context.ts` 및 `src/core/mod-loader.ts`)

*   `ModuleContext` 인터페이스는 `actions: Actions;` 속성을 포함하도록 확장됩니다.
*   `ModLoader`는 모드를 로드할 때 `ModuleContext` 객체를 생성합니다. 이때, `renderer.ts`에서 정의된 `actions` 객체를 `ModuleContext`의 `actions` 속성으로 주입합니다.
*   `ModLoader`는 `sendToRenderer`라는 함수를 통해 렌더러 프로세스로 IPC 메시지를 보낼 수 있습니다. `ModuleContext`의 `actions` 구현은 이 `sendToRenderer` 함수를 사용하여 렌더러 프로세스에 특정 작업을 요청합니다.

### 4. 모듈의 `Actions` 사용 (`src/modules/*.ts`)

*   `Imodule` 인터페이스에 `setActions(actions: Actions): void;` 메서드가 추가되었습니다.
*   `ModuleManager`는 모듈을 등록할 때, 각 모듈의 `setActions` 메서드를 호출하여 `Actions` 객체를 전달합니다.
*   이제 `AutoBlinkmodule`, `AutoIdleAnimationmodule`, `ProactiveDialoguemodule`과 같은 모듈은 `window.animateExpressionAdditive`나 `window.loadAnimationFile`과 같은 전역 함수를 직접 호출하는 대신, `this.actions.setExpression` 또는 `this.actions.playAnimation`과 같이 `Actions` 객체의 메서드를 호출합니다.

### 5. 프로세스 간 통신 (IPC)

*   **`src/main/preload.ts`**: 렌더러 프로세스의 `window` 객체에 `electronAPI`를 노출합니다. 이 `electronAPI`는 `playAnimation`, `showMessage`, `setExpression`과 같은 메서드를 포함하며, 이 메서드들은 `ipcRenderer.invoke`를 사용하여 메인 프로세스로 IPC 메시지를 보냅니다. 또한, 메인 프로세스에서 렌더러로 메시지를 받을 수 있도록 `on` 메서드도 노출합니다.
*   **`src/main/index.ts`**: 메인 프로세스에서 `ipcMain.handle`를 사용하여 `preload.ts`에서 보낸 IPC 메시지를 수신합니다. 예를 들어, `play-animation` 메시지를 받으면, `overlayWindow.webContents.send('play-animation-in-renderer', ...)`를 사용하여 해당 메시지를 렌더러 프로세스로 다시 보냅니다.

### 요약

모듈은 `Actions` 인터페이스를 통해 게임 기능에 접근합니다. 이 `Actions` 객체는 내부적으로 Electron의 IPC를 사용하여 메인 프로세스(모듈이 실행되는 곳)에서 렌더러 프로세스(게임 화면이 렌더링되는 곳)로 명령을 전달합니다. 렌더러 프로세스는 이 명령을 받아 실제 게임 로직을 실행합니다.

이러한 구조는 모더에게 강력하면서도 안전한 API를 제공하며, 게임의 내부 구현과 모듈 간의 결합도를 낮춰 유지보수성과 확장성을 향상시킵니다.
