# <AICompanion>  <!-- TODO: 프로젝트 공식 이름 -->

> **한 줄 요약**:  
> 눈·귀(센서) → 메모장(컨텍스트) → 조건표(트리거) → 행동(액션) 구조를 가진 AI Companion 코어.  
> 개발자는 코드 모드로, 장인은 노코드 에디터로, 라이트 유저는 가져다 쓰는 생태계를 목표로 한다.

---

## 목차

1. [개요](#개요)  
2. [핵심 개념](#핵심-개념)  
3. [아키텍처 다이어그램](#아키텍처-다이어그램)  
4. [레포지토리 구조](#레포지토리-구조)  
5. [빠른 시작](#빠른-시작)  
6. [모드/팩 만들기](#모드팩-만들기)  
7. [퍼미션 & 보안](#퍼미션--보안)  
8. [JSON 스키마](#json-스키마)  
9. [디버깅 & 도구](#디버깅--도구)  
10. [추가 계획 / 로드맵](#추가-계획--로드맵)  
11. [용어집](#용어집)  
12. [라이선스](#라이선스)  
13. [질문 / TODO](#질문--todo)

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

## 아키텍처 다이어그램

### 전체 런타임 흐름

```mermaid
flowchart TD

subgraph Core[Core (Runtime)]
  SENSORS_API[Sensor API]
  CTX[Context Store / Memory]
  TRIG[Trigger Engine]
  QUEUE[Event Queue & Priority]
  ACT[Action Executors]
  UISET[Settings / Permission Layer]

  SENSORS_API --> CTX
  CTX --> TRIG
  TRIG --> QUEUE
  QUEUE --> ACT
  ACT --> CTX
end

subgraph DevMod["Mod (Code Dev)"]
  DEV_ENTRY[entry.js (activate)]
  DEV_CODE[Custom Sensors / Triggers / Actions]
  DEV_UI[Custom Settings UI (optional)]
end

subgraph ArtisanPack["Mod (Data Artisan)"]
  DATA_JSON[Sequences / Triggers JSON]
  NOCODE[Built-in No-Code Runner]
end

DEV_ENTRY --> DEV_CODE --> SENSORS_API
DEV_CODE --> TRIG
DEV_CODE --> ACT
DEV_UI --> UISET

DATA_JSON --> NOCODE --> TRIG
NOCODE --> ACT
Import/Load 시퀀스
mermaid
복사
편집
sequenceDiagram
    autonumber
    participant User
    participant Loader as Core Loader
    participant Sandbox as Sandbox(iframe/worker)
    participant Plugin as Dev Mod(entry.js)
    participant NoCode as No-code Runner

    Note over User,Loader: 개발자 모드
    User->>Loader: 모드 zip 드롭/URL
    Loader->>Loader: mod.json 검증(스키마/퍼미션/API 버전)
    Loader->>Sandbox: 샌드박스 생성 & PluginContext 전달
    Sandbox->>Plugin: entry.js import / activate(ctx)
    Plugin->>Sandbox: 센서/트리거/액션 등록
    Sandbox->>Loader: Ready

    Note over User,Loader: 장인 데이터 팩
    User->>Loader: seqpack zip 드롭
    Loader->>Loader: seqpack 스키마 검증
    Loader->>NoCode: JSON 시퀀스/트리거 전달
    NoCode->>Loader: 공개 API로 등록
    Loader->>User: 활성화 완료
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