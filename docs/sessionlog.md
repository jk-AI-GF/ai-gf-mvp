새로 추가된 기능
모드 활성/비활성 관리 시스템

userdata/mod-settings.json 파일을 통해 모드별 활성화 상태를 저장.

앱 시작 시 이 설정을 읽어서 비활성화된 모드는 로드하지 않음.

ModSettingsManager 클래스

설정 파일 생성/로드/저장을 담당.

API: loadSettings, isModEnabled, setModEnabled, getSettings.

ModLoader 변경

모드 로드 전에 ModSettingsManager.isModEnabled()를 확인.

비활성화된 모드는 건너뜀.

IPC 및 UI 연동

IPC 채널:

get-all-mods

get-mod-settings

set-mod-enabled

Renderer에서 체크박스로 모드를 켜고 끌 수 있는 관리 패널 추가.

동작 방식
앱 실행 → ModSettingsManager가 mod-settings.json을 읽음.

ModLoader가 mods 폴더를 순회하며, 비활성화된 모드는 건너뜀.

Renderer UI에서 상태를 변경하면 mod-settings.json이 즉시 업데이트됨.

변경 후 앱을 재시작하면 새 설정이 적용됨.

코드 구조 변경
새 파일:

src/core/mod-settings-manager.ts

src/renderer/ui-mod-manager.ts

수정:

main/index.ts: IPC 핸들러 추가, ModLoader 초기화 시 ModSettingsManager 전달.

core/mod-loader.ts: 로드 전에 활성화 여부 체크.

preload.ts, global.d.ts: IPC API 노출.

renderer.ts: setupModManagementUI() 호출로 UI 초기화.

이제 다른 개발자는 ModSettingsManager를 활용해 모드 상태를 관리하거나, IPC를 통해 활성화 상태를 변경할 수 있다는 점이 핵심이다.