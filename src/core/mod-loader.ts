
import * as fs from 'fs/promises';
import * as path from 'path';
import { ModuleContext, ICharacterState } from '../module-api/module-context';
import { EventBusImpl } from './event-bus-impl';
import { TriggerEngine } from './trigger-engine';
import { Trigger } from '../module-api/triggers';

// 모드 메타데이터 인터페이스
interface ModManifest {
  name: string;
  version: string;
  entry: string;
}

// 모듈의 기본 내보내기 타입 정의
type ModModule = {
  default?: (ctx: ModuleContext) => void;
};

export class ModLoader {
  private modsDir: string;
  private loadedMods: Map<string, ModManifest> = new Map();
  private eventBus: EventBusImpl;
  private triggerEngine: TriggerEngine;
  private sendToRenderer: (channel: string, ...args: any[]) => void;

  constructor(userDataPath: string, appPath: string, isPackaged: boolean, eventBus: EventBusImpl, triggerEngine: TriggerEngine, sendToRenderer: (channel: string, ...args: any[]) => void) {
    // 개발 환경에서는 프로젝트 루트의 userdata/mods를 사용하고,
    // 배포 환경에서는 Electron의 userData 경로를 사용합니다.
    this.modsDir = isPackaged 
      ? path.join(userDataPath, 'mods') 
      : path.join(appPath, 'userdata', 'mods');
    this.eventBus = eventBus;
    this.triggerEngine = triggerEngine;
    this.sendToRenderer = sendToRenderer;
    console.log(`[ModLoader] Initialized. Mods directory: ${this.modsDir}`);
  }

  public async loadMods(): Promise<void> {
    console.log('[ModLoader] Starting to load mods...');
    try {
      // userdata/mods 폴더가 없으면 생성
      await fs.mkdir(this.modsDir, { recursive: true });

      const modFolders = await fs.readdir(this.modsDir, { withFileTypes: true });

      for (const dirent of modFolders) {
        if (dirent.isDirectory()) {
          const modPath = path.join(this.modsDir, dirent.name);
          await this.loadMod(modPath);
        }
      }
    } catch (error) {
      console.error('[ModLoader] Failed to read mods directory:', error);
    }
    console.log(`[ModLoader] Finished loading mods. Total loaded: ${this.loadedMods.size}`);
  }

  private async loadMod(modPath: string): Promise<void> {
    const manifestPath = path.join(modPath, 'mod.json');
    try {
      // 1. mod.json 읽기 및 파싱
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent) as ModManifest;

      // 필수 필드 검증
      if (!manifest.name || !manifest.version || !manifest.entry) {
        console.error(`[ModLoader] Invalid mod.json in ${modPath}. Missing required fields.`);
        return;
      }

      console.log(`[ModLoader] Loading mod: ${manifest.name} v${manifest.name}`);

      // 2. 모드 진입점(entry) 실행
      // Node.js의 require를 사용하여 외부 모듈을 로드합니다.
      const entryPath = path.join(modPath, manifest.entry);
      console.log(`[ModLoader] Attempting to require: ${entryPath}`);
      // Webpack이 require를 번들링하지 않도록 eval을 사용합니다.
      const modModule: ModModule = eval('require')(entryPath);
      console.log(`[ModLoader] Successfully required module from: ${entryPath}`);

      // 3. 모드 등록 (export default 함수 실행)
      if (typeof modModule.default === 'function') {
        console.log(`[ModLoader] Found default export function for ${manifest.name}. Calling it.`);
        // PluginContext 객체 생성
        const moduleContext: ModuleContext = {
          eventBus: this.eventBus,
          registerTrigger: (trigger: Trigger) => this.triggerEngine.registerTrigger(trigger),
          actions: {
            playAnimation: (animationName: string, loop?: boolean, crossFadeDuration?: number) => {
              this.sendToRenderer('play-animation', animationName, loop, crossFadeDuration);
            },
            showMessage: (message: string, duration?: number) => {
              this.sendToRenderer('show-message', message, duration);
            },
            setExpression: (expressionName: string, weight: number, duration?: number) => {
              this.sendToRenderer('set-expression', expressionName, weight, duration);
            },
            setPose: (poseName: string) => {
              this.sendToRenderer('set-pose', poseName);
            },
            lookAt: (target: 'camera' | [number, number, number] | null) => {
              this.sendToRenderer('look-at', target);
            },
          },
          system: {
            toggleTts: (enable: boolean) => {
              this.sendToRenderer('toggle-tts', enable);
            },
            setMasterVolume: (volume: number) => {
              this.sendToRenderer('set-master-volume', volume);
            },
          },
          characterState: {
            get curiosity(): number {
              // 메인 프로세스에서 렌더러 프로세스로 curiosity 값을 요청
              return this.sendToRenderer('get-character-state-curiosity');
            },
            set curiosity(value: number) {
              // 메인 프로세스에서 렌더러 프로세스로 curiosity 값을 설정
              this.sendToRenderer('set-character-state-curiosity', value);
            },
          } as ICharacterState,
        };
        modModule.default(moduleContext);
        this.loadedMods.set(manifest.name, manifest);
        console.log(`[ModLoader] Successfully registered mod: ${manifest.name}`);
      } else {
        console.warn(`[ModLoader] Mod ${manifest.name} has no default export function to register.`);
      }

    } catch (error) {
      console.error(`[ModLoader] Failed to load mod from ${modPath}:`, error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
    }
  }
}