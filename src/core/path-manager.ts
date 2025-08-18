import { app } from 'electron';
import path from 'path';

// 개발 환경에서는 프로젝트 루트의 .appdata 폴더를 userData 경로로 사용하도록 설정합니다.
// 이 코드는 app 'ready' 이벤트 이전에 실행되어야 합니다.
if (!app.isPackaged) {
  const projectRoot = app.getAppPath();
  app.setPath('userData', path.join(projectRoot, '.appdata', 'userData'));
  app.setPath('cache', path.join(projectRoot, '.appdata', 'cache'));
  app.setPath('logs', path.join(projectRoot, '.appdata', 'logs'));
}

export const PathManager = {
  /**
   * 사용자 데이터 폴더의 경로를 반환합니다. (예: VRM, 시퀀스, 설정)
   * @param paths - 추가적인 하위 경로 세그먼트
   * @returns {string} 절대 경로
   */
  getUserDataPath: (...paths: string[]): string => path.join(app.getPath('userData'), ...paths),

  /**
   * 사용자가 직접 추가/수정하는 에셋(VRM, 시퀀스 등)이 저장되는 'custom' 폴더의 경로를 반환합니다.
   * @param paths - 추가적인 하위 경로 세그먼트
   * @returns {string} 절대 경로
   */
  getCustomAssetsPath: (...paths: string[]): string => path.join(app.getPath('userData'), 'custom', ...paths),

  /**
   * 애플리케이션과 함께 번들로 제공되는 정적 에셋의 경로를 반환합니다.
   * @param paths - 추가적인 하위 경로 세그먼트
   * @returns {string} 절대 경로
   */
  getStaticAssetPath: (...paths: string[]): string => {
    const assetDir = 'public'; 
    const basePath = !app.isPackaged
      ? path.resolve(app.getAppPath(), assetDir)
      : path.join(process.resourcesPath, assetDir);
    return path.join(basePath, ...paths);
  },

  /**
   * 캐시 폴더의 경로를 반환합니다.
   * @param paths - 추가적인 하위 경로 세그먼트
   * @returns {string} 절대 경로
   */
  getCachePath: (...paths: string[]): string => path.join(app.getPath('cache' as any), ...paths),

  /**
   * 로그 폴더의 경로를 반환합니다.
   * @param paths - 추가적인 하위 경로 세그먼트
   * @returns {string} 절대 경로
   */
  getLogPath: (...paths: string[]): string => path.join(app.getPath('logs' as any), ...paths),

  /**
   * LLM 메모리 파일의 경로를 반환합니다.
   * @returns {string} 절대 경로
   */
  getLlmMemoryPath: (): string => path.join(app.getPath('userData'), 'llm-memory.json'),

  /**
   * 애플리케이션 루트 경로를 반환합니다.
   */
   getAppPath: (): string => app.getAppPath(),
};
