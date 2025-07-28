# electron-store 사용 가이드

이 문서는 AI-GF MVP 프로젝트에서 `electron-store`를 사용하여 애플리케이션 설정을 관리하는 방법을 설명합니다.

## 1. `electron-store`란?

`electron-store`는 Electron 애플리케이션을 위한 간단한 데이터 영속성 라이브러리입니다. 사용자의 설정을 JSON 파일로 컴퓨터에 저장하여, 앱을 껐다 켜거나 재설치해도 설정이 유지되도록 합니다.

- **저장 위치**: `C:\Users\<사용자 이름>\AppData\Roaming\ai-gf-mvp\config.json`

## 2. 우리 프로젝트의 설정 관리 아키텍처

우리 프로젝트는 보안과 데이터 일관성을 위해 **메인 프로세스**에서 모든 설정을 중앙 관리합니다. UI(렌더러 프로세스)는 직접 설정 파일을 수정하는 대신, IPC 통신을 통해 메인 프로세스에 요청을 보내 설정을 가져오거나 변경합니다.

1.  **메인 프로세스 (`src/main/index.ts`)**
    -   `electron-store` 인스턴스를 생성하고 `config.json` 파일을 직접 관리하는 유일한 곳입니다.
    -   `ipcMain.handle`, `ipcMain.on`을 사용하여 UI로부터 오는 설정 관련 요청(예: `get-settings`, `set-api-key`)을 처리합니다.

2.  **Preload 스크립트 (`src/main/preload.ts`)**
    -   메인 프로세스와 UI 사이의 안전한 다리 역할을 합니다.
    -   메인 프로세스의 IPC 핸들러를 `window.electronAPI` 객체에 담아 UI에 노출시킵니다.

3.  **렌더러 프로세스 (UI, `src/renderer/`))**
    -   **`AppContext.tsx`**: UI의 상태 관리를 총괄합니다. 앱이 시작될 때 `window.electronAPI`를 통해 메인 프로세스로부터 초기 설정 값을 가져와 `useState`에 저장합니다.
    -   **UI 컴포넌트 (`SettingsModal.tsx` 등)**: `AppContext`로부터 설정 값과 설정 변경 함수를 받아 사용합니다. 사용자가 UI를 조작하면, 이 함수가 `window.electronAPI`를 호출하여 메인 프로세스에 변경 사항을 알립니다.

## 3. 새로운 설정 추가 방법

새로운 설정을 추가해야 할 경우, 다음 단계를 따르세요.

**예시: "자동 실행 여부 (launchOnStartup)" 설정 추가**

1.  **`StoreSchema` 타입 정의 추가 (`src/main/index.ts`)**
    -   `StoreSchema` 인터페이스에 새로운 설정의 타입을 추가합니다.

    ```typescript
    interface StoreSchema {
      windowOpacity: number;
      apiKey: string;
      persona: string;
      launchOnStartup: boolean; // 추가
    }
    ```

2.  **기본값 설정 (`src/main/index.ts`)**
    -   `Store` 인스턴스를 생성할 때 `defaults` 객체에 기본값을 추가합니다.

    ```typescript
    const store = new Store<StoreSchema>({
      defaults: {
        windowOpacity: 1.0,
        apiKey:        '',
        persona:       '',
        launchOnStartup: false, // 추가
      }
    });
    ```

3.  **IPC 핸들러 추가 (`src/main/index.ts`)**
    -   필요한 경우, 새로운 설정을 위한 IPC 핸들러를 추가합니다. (기존 `get-settings` 핸들러가 모든 설정을 반환하므로, 값을 가져오는 핸들러는 수정할 필요가 없을 수 있습니다.)

    ```typescript
    // 설정 저장 핸들러
    ipcMain.on('set-launch-on-startup', (event, enabled: boolean) => {
      store.set('launchOnStartup', enabled);
      // 여기에 실제 자동 실행 로직 추가...
    });

    // 모든 설정을 가져오는 핸들러는 자동으로 새 설정을 포함합니다.
    ipcMain.handle('get-settings', () => {
      return {
        apiKey: store.get('apiKey', ''),
        persona: store.get('persona', ''),
        launchOnStartup: store.get('launchOnStartup', false) // 반환 값에 추가
      };
    });
    ```

4.  **Preload API 노출 (`src/main/preload.ts` & `src/renderer/global.d.ts`)**
    -   `preload.ts`의 `electronAPI`에 새 함수를 추가하고, `global.d.ts`에 타입 정의를 추가합니다.

    ```typescript
    // preload.ts
    const electronAPI = {
      // ... 기존 함수들
      setLaunchOnStartup: (enabled: boolean) => ipcRenderer.send('set-launch-on-startup', enabled),
    };

    // global.d.ts
    export interface IElectronAPI {
      // ... 기존 타입들
      setLaunchOnStartup: (enabled: boolean) => void;
    }
    ```

5.  **`AppContext` 상태 관리 추가 (`src/renderer/contexts/AppContext.tsx`)**
    -   `useState`로 새 설정의 상태를 관리하고, 설정 변경 함수를 컨텍스트를 통해 제공합니다.

    ```tsx
    // ...
    const [launchOnStartup, setLaunchOnStartup] = useState(false);

    useEffect(() => {
      const fetchSettings = async () => {
        const settings = await window.electronAPI.getSettings();
        // ...
        setLaunchOnStartup(settings.launchOnStartup || false);
      };
      fetchSettings();
    }, []);

    const handleSetLaunchOnStartup = (enabled: boolean) => {
      setLaunchOnStartup(enabled);
      window.electronAPI.setLaunchOnStartup(enabled);
    };

    return (
      <AppContext.Provider value={{ launchOnStartup, setLaunchOnStartup: handleSetLaunchOnStartup, ... }}>
        {children}
      </AppContext.Provider>
    );
    ```

6.  **UI 컴포넌트에서 사용**
    -   이제 `SettingsModal.tsx` 같은 컴포넌트에서 `useContext(AppContext)`를 통해 `launchOnStartup` 상태와 `setLaunchOnStartup` 함수를 사용할 수 있습니다.
