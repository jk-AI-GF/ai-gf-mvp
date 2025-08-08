import { app } from 'electron';
import * as path from 'path';

const isDev = !app.isPackaged;

/**
 * Get the absolute path to the 'assets' directory.
 * In development, it points to 'assets' in the project root.
 * In production, assets are packaged under `.webpack/main/assets` inside the ASAR.
 */
export function getAssetsPath(): string {
  return isDev
    ? path.join(app.getAppPath(), 'assets')
    : path.join(process.resourcesPath, 'app.asar', '.webpack', 'main', 'assets');
}

/**
 * Get the absolute path to the 'userdata' directory.
 * In development, it points to 'userdata' in the project root.
 * In production, it points to the 'userdata' directory inside the app's user data folder.
 * This ensures user data persists across app updates.
 */
export function getUserDataPath(): string {
    return isDev
        ? path.join(app.getAppPath(), 'userdata')
        : path.join(app.getPath('userData'));
}

/**
 * Resolves a relative path within the 'assets' directory to an absolute path.
 * @param subpath - The relative path within the assets directory (e.g., 'VRM/model.vrm').
 * @returns The full absolute path.
 */
export function resolveAssetsPath(subpath: string): string {
  return path.join(getAssetsPath(), subpath);
}

/**
 * Resolves a relative path within the 'userdata' directory to an absolute path.
 * @param subpath - The relative path within the userdata directory (e.g., 'mods/my-mod').
 * @returns The full absolute path.
 */
export function resolveUserDataPath(subpath: string): string {
  return path.join(getUserDataPath(), subpath);
}
