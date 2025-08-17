import { PathManager } from './path-manager';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 관리할 리소스의 종류를 정의합니다.
 */
export type AssetType = 'vrm' | 'animation' | 'pose' | 'image' | 'sequence';

/**
 * 프로젝트의 모든 리소스(에셋)를 중앙에서 관리하는 클래스입니다.
 * 정적(static) 리소스와 사용자 커스텀(custom) 리소스를 모두 처리합니다.
 */
export class ResourceManager {
  private assetTypeToPaths: Record<AssetType, string[]>;

  constructor() {
    // 각 리소스 종류별로 검색할 기본 폴더 경로 목록을 설정합니다.
    // 사용자 커스텀 리소스를 먼저 검색하도록 순서를 조정할 수 있습니다.
    this.assetTypeToPaths = {
      vrm: [PathManager.getCustomAssetsPath('vrm'), PathManager.getStaticAssetPath('vrm')],
      animation: [PathManager.getCustomAssetsPath('animations'), PathManager.getStaticAssetPath('animations')],
      pose: [PathManager.getCustomAssetsPath('poses'), PathManager.getStaticAssetPath('poses')],
      image: [PathManager.getCustomAssetsPath('images'), PathManager.getStaticAssetPath('images')],
      sequence: [PathManager.getCustomAssetsPath('sequences')], // 시퀀스는 사용자가 생성하는 데이터이므로 custom 폴더만 검색
    };
  }

  /**
   * 파일이 실제로 존재하는지 확인합니다.
   * @param filePath - 확인할 파일 경로
   * @returns 파일 존재 여부
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 리소스 종류와 파일명을 받아 실제 파일 시스템의 절대 경로를 반환합니다.
   * 절대 경로가 입력되면 존재 여부만 확인하고, 상대 경로(파일명)가 입력되면
   * 등록된 모든 경로를 순회하며 파일을 찾습니다.
   * @param assetType - 리소스 종류
   * @param fileNameOrPath - 파일명 또는 전체 경로
   * @returns 찾은 파일의 절대 경로, 없으면 null
   */
  async resolvePath(assetType: AssetType, fileNameOrPath: string): Promise<string | null> {
    if (path.isAbsolute(fileNameOrPath)) {
      return (await this.fileExists(fileNameOrPath)) ? fileNameOrPath : null;
    }

    const searchPaths = this.assetTypeToPaths[assetType];
    for (const basePath of searchPaths) {
      const fullPath = path.join(basePath, fileNameOrPath);
      if (await this.fileExists(fullPath)) {
        return fullPath;
      }
    }

    console.warn(`[ResourceManager] Asset not found: type=${assetType}, name=${fileNameOrPath}`);
    return null;
  }

  /**
   * 특정 종류의 모든 리소스 파일명을 배열로 반환합니다.
   * @param assetType - 가져올 리소스 종류
   * @returns 파일명 문자열 배열
   */
  async listAssets(assetType: AssetType): Promise<string[]> {
    const searchPaths = this.assetTypeToPaths[assetType];
    const allFiles = new Set<string>();

    for (const basePath of searchPaths) {
      try {
        // 폴더가 없으면 생성하여 오류를 방지합니다.
        await fs.mkdir(basePath, { recursive: true });
        const files = await fs.readdir(basePath);
        files.forEach(file => allFiles.add(file));
      } catch (error) {
        console.error(`[ResourceManager] Error reading directory ${basePath}:`, error);
      }
    }

    return Array.from(allFiles);
  }
}

// ResourceManager 인스턴스를 싱글톤으로 생성하여 export합니다.
export const resourceManager = new ResourceManager();
