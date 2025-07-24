# <AICompanion>
 
> 자신만의 AI 친구를 만들어 보세요

---

## 목차

1. [개요](#개요)  
2. [핵심 개념](#핵심-개념)  
3. [레포지토리 구조](#레포지토리-구조)  
4. [빠른 시작](#빠른-시작)  
5. [모드/팩 만들기](#모드팩-만들기)  
6. [퍼미션 & 보안](#퍼미션--보안)  
7. [JSON 스키마](#json-스키마)  
8. [디버깅 & 도구](#디버깅--도구)  
9. [추가 계획 / 로드맵](#추가-계획--로드맵)  
10. [용어집](#용어집)  
11. [라이선스](#라이선스)  
12. [질문 / TODO](#질문--todo)

---

## 개요

- **코어(Core)**: 최소한의 런타임(센서 관리, 컨텍스트 저장, 트리거 평가, 이벤트 큐, 액션 실행, 퍼미션 관리).  
- **모드(Mod)**: 코어에 플러그인 형태로 꽂는 확장팩.
  - **코드 모드(개발자용)**: TS/JS로 센서·트리거·액션·커스텀 설정 UI까지 구현.
  - **데이터 팩(장인용)**: 내장 시퀀스/트리거 에디터로 만든 JSON 묶음. 코드는 없음.  
- **라이트 유저**: 만든 것들을 가져와서 활성화만 한다.

---

## 핵심 개념

| 이름 | 설명 | 예시 |
|---|---|---|
| **Sensor(센서)** | 유저 행동/환경을 감지해 컨텍스트에 값 저장 | 마우스 위치, 현재 활성 탭, 최근 대화 텍스트 |
| **Context(컨텍스트/메모리)** | 최근 상태를 저장하는 키-값 저장소 | `mouse.x = 120`, `dialog.lastUserText = "배고파"` |
| **Trigger(트리거)** | 조건표. 컨텍스트를 보고 “발동할지” 판단 | `mouse.x < 50 && mouse.y < 50` 3초 유지 |
| **Event / Action(이벤트/액션)** | 실제로 일어나는 동작 | AI 답변, 표정/포즈 변경, 토스트 메시지 등 |
| **Permission(퍼미션)** | 모드가 쓰는 권한 리스트 | `sensor.mouse`, `ai.reply`, `avatar.expression` |
| **Schema(스키마)** | JSON 구조/타입 정의(검증용) | `mod.json`, `sequence.json`, `trigger.json` 등 |

---

레포지토리 구조
모노레포 권장(pnpm/yarn workspaces). 예시:

perl
복사
편집
project-root/
├─ apps/
│  ├─ launcher-web/          # 브라우저 런처
│  └─ launcher-electron/     # Electron 셸 (옵션)
│
├─ packages/
│  ├─ core/                  # 런타임 핵심 (EventBus, Context, Trigger, Queue...)
│  ├─ plugin-api/            # 모드가 import할 타입/헬퍼
│  ├─ sandbox/               # iframe/worker RPC & 격리
│  ├─ no-code-runner/        # 장인 데이터팩용 실행기
│  ├─ schemas/               # JSON Schema 모음
│  └─ utils/                 # 공통 유틸
│
├─ tools/
│  ├─ editor/                # 노코드 시퀀스/트리거 에디터 (React 등)
│  ├─ cli/                   # create-mod, validate, pack 등
│  └─ validator/             # 독립 검증기 (선택)
│
├─ examples/
│  ├─ hello-mod/             # 코드 모드 예시
│  └─ hello-pack/            # 데이터팩 예시
│
├─ assets-core/              # 코어가 쓰는 기본 리소스(최소)
├─ userdata/                 # 유저 설치 모드/팩/설정 (git ignore)
│  ├─ mods/
│  ├─ packs/
│  └─ settings.json
│
├─ pnpm-workspace.yaml       # 또는 yarn/pnpm 설정
├─ tsconfig.base.json
└─ README.md / docs/