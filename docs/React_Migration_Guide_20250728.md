# React 도입 및 UI 컴포넌트 마이그레이션 가이드 (2025-07-28)

## 1. 개요: 완료된 작업

본 문서는 기존 Electron/TypeScript 프로젝트에 React를 성공적으로 도입하고, 첫 번째 UI 요소인 '설정 모달'을 React 컴포넌트로 전환하는 과정을 기록합니다.

### 주요 성공 사항
- **React 환경 구축:** `react`, `react-dom` 및 JSX 처리를 위한 Babel/TypeScript 설정을 완료했습니다.
- **UI 렌더링 레이어 분리:** 기존 Three.js 캔버스와 React UI가 독립적으로 렌더링되도록 HTML 구조를 재설계했습니다. (`<div id="canvas-container">`와 `<div id="root">`)
- **첫 컴포넌트 이식 성공:** `index.html`과 `app-main.ts`에 흩어져 있던 '설정 모달'을 재사용 가능한 단일 컴포넌트 `SettingsModal.tsx`로 성공적으로 이식했습니다.
- **기능 복원:** 이식된 `SettingsModal` 컴포넌트에 `localStorage`를 사용한 설정 저장/불러오기 및 파일 시스템 연동 로직을 React 방식으로 재구현했습니다.

---

## 2. 주요 특이사항 및 해결 과정

이번 마이그레이션 과정에서 React 컴포넌트가 화면에 보이지 않는 심각한 문제가 발생했으며, 해결 과정에서 중요한 교훈을 얻었습니다.

### 문제 현상
- `SettingsModal` 컴포넌트가 DOM 상에는 렌더링되지만, 화면에는 전혀 보이지 않았습니다.

### 실패했던 해결 시도
1.  **단순 `z-index` 조정:** `#root` 컨테이너의 `z-index`를 높이는 방법은 다른 기존 UI 요소(`animation-buttons` 등)의 더 높은 `z-index` 값 때문에 실패했습니다.
2.  **React Portal (`createPortal`):** 컴포넌트를 `document.body` 최상단으로 렌더링하는 포털 기능 역시 예상과 달리 작동하지 않았습니다. 이는 Electron의 렌더링 컨텍스트와 기존 CSS의 복잡한 '쌓임 순서(Stacking Context)'가 충돌을 일으킨 것으로 추정됩니다.

### 최종 해결책: 레이어 분리 및 `position: absolute` 활용
- **근본 원인:** `position: fixed` 속성이 복잡한 환경에서 예상치 못한 렌더링 문제를 야기했습니다.
- **해결:**
    1.  React UI를 위한 최상위 컨테이너 `#root`를 명확히 분리했습니다.
    2.  `SettingsModal` 컴포넌트에서 `position: fixed`를 완전히 제거했습니다.
    3.  대신, **`#root`를 기준으로 하는 `position: absolute`와 `flexbox`를 사용**하여 모달과 오버레이를 화면 중앙에 배치했습니다. 이 방식은 안정적으로 작동함을 확인했습니다.

> **핵심 교훈:** 앞으로 제작될 모든 React 모달, 팝업, 오버레이는 **`position: fixed` 사용을 지양**하고, 이번 `SettingsModal`처럼 **`#root` 내에서 `position: absolute`와 `flexbox`로 레이아웃을 잡는 패턴**을 따라야 합니다.

---

## 3. 후속 조치 사항

- **`SettingsService.ts`의 완전한 대체:** 현재 `SettingsService`는 기능이 정지된 상태입니다. `SettingsModal`에 임시로 구현된 로직들을 추후 별도의 서비스 모듈(예: `src/renderer/services/settings.ts`)로 분리하여 컴포넌트의 책임과 비즈니스 로직을 분리하는 리팩토링을 고려할 수 있습니다.
- **배경 설정 기능 이식:** 현재 `SettingsModal`의 '배경 설정'은 아무 기능도 하지 않습니다. 이 기능은 Three.js 씬에 직접 영향을 주므로, 추후 `Actions` 인터페이스를 React 컨텍스트로 연결한 뒤 해당 기능을 구현해야 합니다.
- **전역 상태 통일:** 현재 페르소나 데이터가 `localStorage`와 `window.personaText`에 이중으로 저장되고 있습니다. 향후 모든 상태는 React의 상태 관리(Context, Zustand 등)로 통일하여 데이터 흐름을 명확히 해야 합니다.

---

## 4. 향후 컴포넌트 마이그레이션 계획

다른 레거시 UI 요소들(예: 관절 조절, 표정 패널 등)을 React 컴포넌트로 전환하기 위한 표준 절차는 다음과 같습니다.

**1단계: 대상 선정 및 컴포넌트 생성**
- `index.html`에서 전환할 UI 요소의 HTML 블록을 찾습니다. (예: `<div id="joint-control-panel">...</div>`)
- `src/renderer/components/` 폴더에 `JointControlPanel.tsx`와 같은 새 컴포넌트 파일을 만듭니다.
- HTML을 JSX로 변환하여 컴포넌트의 기본 구조를 만듭니다.

**2단계: 부모 컴포넌트(`App.tsx`)에서 상태 관리**
- `App.tsx`에 `useState`를 사용하여 패널의 노출 여부를 제어하는 상태를 추가합니다.
  ```tsx
  const [isJointPanelOpen, setIsJointPanelOpen] = useState(false);
  ```
- `App.tsx`의 `return` 문 안에서 새 컴포넌트를 조건부로 렌더링합니다.
  ```tsx
  {isJointPanelOpen && <JointControlPanel onClose={() => setIsJointPanelOpen(false)} />}
  ```
- 기존 사이드바의 '관절 조절' 버튼을 React 컴포넌트로 대체하고, `onClick` 이벤트에 `setIsJointPanelOpen(true)`를 연결합니다.

**3단계: 기능 구현 (상태 및 `Actions` 연동)**
- **UI 내부 상태:** 슬라이더 값 등 컴포넌트 내부에서만 쓰이는 상태는 해당 컴포넌트의 `useState`로 관리합니다.
- **외부 기능 호출:** 캐릭터의 관절을 실제로 조작하는 것과 같은 기능은 **`Actions` 인터페이스**를 통해 호출해야 합니다. 이를 위해 `ActionContext`를 구현하여 모든 컴포넌트가 `actions` 객체에 쉽게 접근할 수 있도록 해야 합니다. (다음 작업)

**4.단계: 레거시 코드 제거**
- 새로운 React 컴포넌트가 완벽하게 작동하는 것을 확인한 후,
- `index.html`에서 원본 HTML 블록(예: `<div id="joint-control-panel">`)을 삭제합니다.
- `app-main.ts` 또는 `ui-manager.ts` 등에서 해당 DOM 요소를 제어하던 모든 JavaScript 코드를 삭제합니다.

이 절차를 따르면 모든 UI 요소를 체계적이고 안정적으로 React 생태계로 이전할 수 있습니다.
