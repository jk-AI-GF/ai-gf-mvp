# SystemControls 인터페이스 설명

`SystemControls` 인터페이스는 모더가 게임의 특정 시스템 수준 기능을 제어할 수 있도록 제공되는 API입니다. 이는 `Actions` 인터페이스가 게임 내에서 직접적인 '행동'을 수행하는 것과 달리, 게임의 전반적인 동작 방식이나 설정을 변경하는 데 사용됩니다.

## 인터페이스 정의

```typescript
export interface SystemControls {
  /**
   * TTS(Text-to-Speech) 기능을 활성화하거나 비활성화합니다.
   * @param enable TTS 기능을 활성화할지(true) 비활성화할지(false) 여부.
   */
  toggleTts(enable: boolean): void;
}
```

## 사용 예시 (모듈 내부)

모듈 내에서 `SystemControls`를 사용하려면, `ModuleContext`를 통해 접근할 수 있습니다.

```typescript
import { Imodule } from './module-manager';
import { ModuleContext } from '../module-api/module-context';

export class MyModule implements Imodule {
  public readonly name = 'MyModule';
  public enabled = true;

  private context: ModuleContext;

  public setModuleContext(context: ModuleContext): void {
    this.context = context;
  }

  public update(delta: number): void {
    // 예시: 특정 조건에서 TTS를 비활성화
    if (someCondition) {
      this.context.system.toggleTts(false);
    }
    // 예시: 다른 조건에서 TTS를 활성화
    if (anotherCondition) {
      this.context.system.toggleTts(true);
    }
  }
}
```

## `ModuleContext`를 통한 접근

`ModuleContext`는 `eventBus`, `actions`와 함께 `system` 속성을 통해 `SystemControls` 인터페이스를 노출합니다.

```typescript
export interface ModuleContext {
  eventBus: EventBus;
  registerTrigger(trigger: Trigger): void;
  actions: Actions;
  system: SystemControls; // 여기에 SystemControls가 추가됩니다.
}
```

이러한 분리를 통해 모더는 게임의 '행동'과 '설정'을 명확히 구분하여 제어할 수 있으며, API의 구조적 명확성과 확장성을 높일 수 있습니다.
