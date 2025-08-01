
import { IpcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import mime from 'mime';
import { PluginContext, ICharacterState } from '../plugin-api/plugin-context';
import { EventBus } from '../plugin-api/event-bus';
import { TriggerEngine } from './trigger-engine';
import { Trigger } from '../plugin-api/triggers';
import { ContextStore } from './context-store';
import { ModSettingsManager } from './mod-settings-manager';
import { ActionDefinition } from '../plugin-api/actions';

// 모드 메타데이터 인터페이스
interface ModManifest {
  name: string;
  version: string;
  entry: string;
}

// 모드의 기본 내보내기 타입 정의
type ModExport = {
  default?: (ctx: PluginContext) => void;
};

export class ModLoader {
  private modsDir: string;
  private loadedMods: Map<string, ModManifest> = new Map();
  private eventBus: EventBus;
  private triggerEngine: TriggerEngine;
  private contextStore: ContextStore;
  private modSettingsManager: ModSettingsManager;
  private sendToRenderer: (channel: string, ...args: any[]) => void;
  private ipcMain: IpcMain;
  private getAvailableActions: () => ActionDefinition[];

  constructor(
    userDataPath: string, 
    appPath: string, 
    isPackaged: boolean, 
    eventBus: EventBus, 
    triggerEngine: TriggerEngine, 
    contextStore: ContextStore, 
    modSettingsManager: ModSettingsManager,
    sendToRenderer: (channel: string, ...args: any[]) => void,
    ipcMain: IpcMain,
    getAvailableActions: () => ActionDefinition[]
  ) {
    // 개발 환경에서는 프로젝트 루트의 userdata/mods를 사용하고,
    // 배포 환경에서는 Electron의 userData 경로를 사용합니다.
    this.modsDir = isPackaged 
      ? path.join(userDataPath, 'mods') 
      : path.join(appPath, 'userdata', 'mods');
    this.eventBus = eventBus;
    this.triggerEngine = triggerEngine;
    this.contextStore = contextStore;
    this.modSettingsManager = modSettingsManager;
    this.sendToRenderer = sendToRenderer;
    this.ipcMain = ipcMain;
    this.getAvailableActions = getAvailableActions;
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

      // Check if the mod is enabled before proceeding
      if (!this.modSettingsManager.isModEnabled(manifest.name)) {
        console.log(`[ModLoader] Skipping disabled mod: ${manifest.name}`);
        return;
      }

      console.log(`[ModLoader] Loading mod: ${manifest.name} v${manifest.name}`);

      // 2. 모드 진입점(entry) 실행
      // Node.js의 require를 사용하여 외부 파일을 로드합니다.
      const entryPath = path.join(modPath, manifest.entry);
      console.log(`[ModLoader] Attempting to require: ${entryPath}`);
      // Webpack이 require를 번들링하지 않도록 eval을 사용합니다.
      const modExport: ModExport = eval('require')(entryPath);
      console.log(`[ModLoader] Successfully required file from: ${entryPath}`);

      // 3. 모드 등록 (export default 함수 실행)
      if (typeof modExport.default === 'function') {
        console.log(`[ModLoader] Found default export function for ${manifest.name}. Calling it.`);
        // PluginContext 객체 생성
        const pluginContext: PluginContext = {
          eventBus: this.eventBus,
          registerTrigger: (trigger: Trigger) => this.triggerEngine.registerTrigger(trigger),
          get: (key: string) => this.contextStore.get(key),
          set: (key: string, value: any) => this.contextStore.set(key, value),
          getAll: () => this.contextStore.getAll(),
          actions: this.createActionProxies(modPath, manifest.name), // 동적 프록시 생성
          system: {
            toggleTts: (enable: boolean) => {
              this.sendToRenderer('toggle-tts', enable);
            },
            toggleMouseIgnore: () => {
              this.ipcMain.emit('toggle-mouse-ignore');
            },
            setMasterVolume: (volume: number) => {
              this.sendToRenderer('set-master-volume', volume);
            },
            registerCustomTrigger: (trigger: any) => {
              console.warn('[ModLoader] registerCustomTrigger is not supported for mods running in the main process.');
            },
            unregisterCustomTrigger: (triggerId: string) => {
              console.warn('[ModLoader] unregisterCustomTrigger is not supported for mods running in the main process.');
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
        modExport.default(pluginContext);
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

  private createActionProxies(modPath: string, modName: string): any {
    const proxies: { [key: string]: (...args: any[]) => any } = {};

    // getAvailableActions는 항상 로컬 캐시에서 처리
    proxies['getAvailableActions'] = () => Promise.resolve(this.getAvailableActions());

    const actionDefinitions = this.getAvailableActions();

    for (const actionDef of actionDefinitions) {
      const actionName = actionDef.name;

      if (actionName === 'getAvailableActions') continue;

      // 메인 프로세스에서 직접 처리해야 하는 액션들
      if (actionName === 'setContext') {
        proxies[actionName] = (key: string, value: any) => {
          this.contextStore.set(key, value);
        };
        continue;
      }
      if (actionName === 'getContext') {
        proxies[actionName] = (key: string) => {
          return this.contextStore.get(key);
        };
        continue;
      }

      // 특별한 파일 처리 로직이 필요한 액션
      if (actionName === 'changeBackground') {
        proxies[actionName] = async (imagePath: string) => {
          try {
            const fullPath = path.join(modPath, imagePath);
            if (!fullPath.startsWith(modPath)) {
              console.error(`[ModLoader] Security violation: Mod ${modName} attempted to access file outside its directory: ${imagePath}`);
              return;
            }
            const fileBuffer = await fs.readFile(fullPath);
            const mimeType = mime.getType(fullPath) || 'application/octet-stream';
            const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
            this.sendToRenderer('proxy-action', actionName, [dataUrl]);
          } catch (error) {
            console.error(`[ModLoader] Error in ${actionName} for mod ${modName}:`, error);
          }
        };
        continue;
      }

      // 나머지 모든 액션은 렌더러로 요청을 보내는 일반 프록시로 생성
      proxies[actionName] = (...args: any[]) => {
        this.sendToRenderer('proxy-action', actionName, args);
      };
    }

    return proxies;
  }
}