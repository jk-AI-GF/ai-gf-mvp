import * as fs from 'fs/promises';
import * as path from 'path';

// 모드 이름(string)을 키로, 활성화 여부(boolean)를 값으로 하는 맵
type ModSettings = Record<string, boolean>;

export class ModSettingsManager {
  private settings: ModSettings = {};
  private settingsFilePath: string;

  constructor(userDataPath: string) {
    this.settingsFilePath = path.join(userDataPath, 'mod-settings.json');
  }

  /**
   * 파일에서 설정을 비동기적으로 로드합니다. 파일이 없으면 빈 객체로 시작합니다.
   */
  public async loadSettings(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.settingsFilePath, 'utf-8');
      this.settings = JSON.parse(fileContent);
      console.log('[ModSettingsManager] Settings loaded from', this.settingsFilePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 파일이 없으면 기본값으로 시작 (모든 모드는 기본적으로 활성화)
        console.log('[ModSettingsManager] Settings file not found. Initializing with default settings.');
        this.settings = {};
        await this.saveSettings(); // 빈 설정 파일 생성
      } else {
        console.error('[ModSettingsManager] Error loading mod settings:', error);
        this.settings = {}; // 오류 발생 시 안전을 위해 기본값으로 리셋
      }
    }
  }

  /**
   * 특정 모드가 활성화되어 있는지 확인합니다.
   * 설정에 없는 모드는 기본적으로 활성화된 것으로 간주합니다.
   * @param modName 확인할 모드의 이름
   * @returns 모드가 활성화되어 있으면 true, 아니면 false
   */
  public isModEnabled(modName: string): boolean {
    // 설정에 키가 없으면(undefined), 기본적으로 true를 반환
    return this.settings[modName] !== false;
  }

  /**
   * 모드의 활성화 상태를 설정하고 파일에 저장합니다.
   * @param modName 설정할 모드의 이름
   * @param isEnabled 활성화 상태
   */
  public async setModEnabled(modName: string, isEnabled: boolean): Promise<void> {
    this.settings[modName] = isEnabled;
    await this.saveSettings();
    console.log(`[ModSettingsManager] Set ${modName} to ${isEnabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 현재 설정 객체를 반환합니다.
   * @returns 현재 모드 설정
   */
  public getSettings(): ModSettings {
    return this.settings;
  }

  /**
   * 현재 설정을 JSON 파일에 저장합니다.
   */
  private async saveSettings(): Promise<void> {
    try {
      await fs.writeFile(this.settingsFilePath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (error) {
      console.error('[ModSettingsManager] Error saving mod settings:', error);
    }
  }
}
