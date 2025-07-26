
import { TypedEventBus, AppEvents } from '../core/event-bus';

// 모듈 API에서 사용할 이벤트 버스는 AppEvents 타입을 따릅니다.
// 이를 통해 모듈 개발 시 자동 완성과 타입 체크의 이점을 얻을 수 있습니다.
export type EventBus = TypedEventBus<AppEvents>;
