# AI-GF MVP

> **모딩(Modding) 생태계 중심의 인터랙티브 AI 캐릭터 애플리케이션**

AI-GF는 사용자와 상호작용하는 3D 캐릭터를 구현한 데스크톱 애플리케이션입니다. 이 프로젝트의 핵심 철학은 단순히 완성된 기능을 제공하는 것을 넘어, 사용자가 직접 캐릭터의 행동과 상호작용을 창조하고 공유할 수 있는 **강력하고 유연한 모딩 샌드박스**를 제공하는 것입니다.

사용자는 더 이상 단순한 관객이 아닌, 자신만의 AI 캐릭터를 연출하는 **감독(Director)**이 됩니다.

![Application Screenshot](https://via.placeholder.com/800x450.png?text=AI-GF+Application+Screenshot)
*(스크린샷 예시 - 실제 이미지로 교체 필요)*

---

## ✨ 주요 기능 (Key Features)

*   **🎨 비주얼 스크립팅 (Visual Scripting):** `Sequence` 시스템을 통해 코딩 없이 노드 기반 에디터로 복잡한 캐릭터 행동 로직과 스토리를 직접 만들 수 있습니다.
*   **🧩 강력한 모딩 API:** 모든 핵심 기능은 플러그인과 모드에서 동일하게 사용할 수 있는 `Action` API로 노출됩니다. 코어 플러그인과 사용자 모드는 기술적으로 동등한 권한을 가집니다.
*   **🤖 LLM 기반 대화 시스템:** Google Gemini, OpenAI, Anthropic 등 최신 언어 모델(LLM)과 연동하여 자연스러운 대화와 상황 판단 능력을 갖추고 있습니다.
*   **🗣️ TTS 음성 출력:** Python FastAPI 기반의 백엔드를 통해 Google TTS 또는 로컬 Coqui TTS 모델로 자연스러운 음성을 생성하고 스트리밍합니다.
*   **💃 VRM 모델 완벽 지원:** `@pixiv/three-vrm`을 사용하여 VRM 포맷의 3D 모델, 애니메이션, 표정을 완벽하게 제어합니다.
*   **🛡️ 안정적인 아키텍처:** `EventBus`, `ActionRegistry` 등 핵심 시스템을 통해 각 기능이 독립적으로 작동하여 안정성과 확장성을 보장합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

| 분야                  | 기술                                                              |
| --------------------- | ----------------------------------------------------------------- |
| **Application Shell** | **Electron**                                                      |
| **UI (Renderer)**     | **React**, **TypeScript**, **Three.js** (@pixiv/three-vrm)        |
| **Backend (TTS)**     | **Python**, **FastAPI**, **Google-TTS** / **Coqui-TTS**           |
| **Build Tools**       | **Webpack**, **Electron Forge**                                   |
| **State Management**  | **React Context**, **Electron Store**, Custom In-Memory Stores    |

---

## 🚀 시작하기 (Getting Started)

### 사전 요구사항 (Prerequisites)

*   [Node.js](https://nodejs.org/) (v18.x 이상 권장)
*   [Python](https://www.python.org/) (v3.9 이상 권장)

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone https://github.com/your-username/ai-gf-mvp.git
cd ai-gf-mvp

# 메인 애플리케이션 의존성 설치
npm install
```

### 2. Python 백엔드(TTS) 서버 실행

```bash
# 백엔드 디렉토리로 이동
cd backend

# Python 가상환경 생성 및 활성화 (권장)
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate    # Windows

# Python 의존성 설치
pip install -r requirements.txt

# 백엔드 서버 실행
python main.py
```
TTS 서버는 `http://localhost:8000`에서 실행됩니다.

### 3. 메인 애플리케이션 실행

```bash
# 프로젝트 루트 디렉토리에서 실행
npm start
```

---

## 📁 프로젝트 구조 (Project Structure)

```
.
├── backend/              # Python FastAPI 기반 TTS 서버
├── docs/                 # 📖 프로젝트 아키텍처, 개발 가이드 등 상세 문서
├── public/               # VRM, 애니메이션 등 정적 에셋
├── src/
│   ├── core/             # 🧠 Action, EventBus, Sequence 등 핵심 로직
│   ├── main/             # Electron 메인 프로세스 (Node.js)
│   ├── renderer/         # 🎨 프론트엔드 (React, Three.js)
│   ├── plugins/          # ✨ 기본 행동을 제공하는 코어 플러그인
│   └── plugin-api/       # 🔌 모드(Mod) 개발을 위한 API 정의
└── .appdata/
    └── userData/
        └── custom/       # 📂 사용자가 추가하는 VRM, 모드, 시퀀스 폴더
```

---

## 🤝 기여 및 모드 제작 (Contributing & Modding)

이 프로젝트에 기여하는 가장 좋은 방법은 **새로운 모드(플러그인)나 시퀀스를 만드는 것**입니다!

자세한 개발 방법은 아래의 공식 문서를 참고하세요.

*   **[DEVELOPMENT_COOKBOOK.md](./DEVELOPMENT_COOKBOOK.md):** 새로운 `Action` 추가, `Event` 사용법 등 일반적인 개발 워크플로우를 안내하는 실용적인 가이드입니다.
*   **[Architecture Overview](./docs/Architecture_Overview.md):** 프로젝트의 전체적인 구조와 데이터 흐름을 이해하기 위한 문서입니다.
*   **[Visual Scripting Guide](./docs/Vision_Visual_Scripting.md):** `Sequence` 시스템의 컨셉과 사용법을 설명합니다.

---

## 📜 라이선스 (License)

[MIT](./LICENSE)
