# 향후 개선 사항

이 문서는 현재 아키텍처에서 발견된 문제점과 이를 해결하기 위한 장기적인 개선 아이디어를 기록합니다.

## 1. PluginContext 생성 로직 통합 및 단순화 (Proxy 패턴 도입)

### 현상 및 문제점

-   **이원화된 구현**: `PluginContext`의 구현이 두 곳에 나뉘어 있습니다.
    1.  **렌더러 프로세스용**: `src/plugin-api/context-factory.ts`에서 실제 로직을 포함하여 생성됩니다.
    2.  **메인 프로세스용 (모드 로더)**: `src/core/mod-loader.ts`에서 각 `actions`와 `system` API를 개별적으로 구현하여 IPC 통신을 중계하는 방식으로 생성됩니다.
-   **유지보수 어려움**: 이 구조 때문에 `PluginContext`의 API(예: `system.toggleMouseIgnore`)가 변경될 때마다 두 파일을 모두 수정해야 합니다. 이 과정에서 `mod-loader.ts`의 수정을 누락하여 타입 에러가 발생하는 등 오류 가능성이 높고 번거롭습니다.

### 개선 방안

-   **범용 IPC 프록시 도입**: `mod-loader.ts`에서 `actions`와 `system`의 각 함수를 수동으로 구현하는 대신, JavaScript의 `Proxy` 객체를 사용하여 범용 프록시(Proxy)를 생성합니다.
-   **자동 메시지 변환**: 이 프록시는 `context.actions.someFunction(arg1, arg2)`와 같은 모든 API 호출을 가로채서, `'action:someFunction'` 형태의 IPC 채널 이름과 인자 `[arg1, arg2]`를 동적으로 생성하여 렌더러 프로세스로 전송하는 역할을 합니다.

```javascript
// 개선 아이디어 예시 (mod-loader.ts)

const createApiProxy = (apiName) => {
  return new Proxy({}, {
    get: (target, prop, receiver) => {
      // prop은 호출된 함수의 이름 (예: 'playAnimation')
      return (...args) => {
        const channel = `${apiName}:${String(prop)}`; // 'actions:playAnimation'
        this.sendToRenderer(channel, ...args);
      };
    }
  });
};

const pluginContext = {
  // ...
  actions: createApiProxy('actions'),
  system: createApiProxy('system'),
  // ...
};
```

### 기대 효과

-   **유지보수성 향상**: `PluginContext`의 API가 추가/변경되어도 프록시 로직은 수정할 필요가 없어집니다. 모든 API 호출이 동적으로 처리되기 때문입니다.
-   **중앙 집중화**: `PluginContext`의 실제 구현은 `context-factory.ts` 한 곳에만 존재하게 되어, API의 책임과 역할이 명확해지고 코드를 파악하기 쉬워집니다.
-   **오류 감소**: 수동으로 양쪽 파일을 동기화할 필요가 없어지므로, 구현 누락으로 인한 타입 에러나 런타임 오류 발생 가능성이 크게 줄어듭니다.