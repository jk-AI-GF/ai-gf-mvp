import { AppEvents, TypedEventBus } from '../core/event-bus';
import { ImageAssetState } from '../plugin-api/asset-types';

type AssetDataResponse = { success: boolean; data?: string; error?: string };

export class ImageAssetManager {
  private assets = new Map<string, ImageAssetState>();
  private eventBus: TypedEventBus<AppEvents>;

  constructor(eventBus: TypedEventBus<AppEvents>) {
    this.eventBus = eventBus;
  }

  private notifyUpdates() {
    this.eventBus.emit('assets:updated', { assets: this.getAssets() });
  }

  public getAssets(): ImageAssetState[] {
    return Array.from(this.assets.values());
  }

  public async show(fileName: string, options?: Partial<Omit<ImageAssetState, 'id' | 'fileName' | 'dataUrl'>>): Promise<string | null> {
    const result = await window.electronAPI.invoke('get-2d-asset-data', fileName) as AssetDataResponse;
    if (!result.success || !result.data) {
      console.error(`[ImageAssetManager] Failed to load asset data for ${fileName}: ${result.error}`);
      return null;
    }

    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newState: ImageAssetState = {
      id: assetId,
      fileName,
      dataUrl: result.data,
      visible: true,
      x: options?.x ?? 0.5,
      y: options?.y ?? 0.5,
      scale: options?.scale ?? 1.0,
      opacity: options?.opacity ?? 1.0,
    };

    this.assets.set(assetId, newState);
    this.notifyUpdates();
    console.log(`[ImageAssetManager] Shown asset ${fileName} with ID ${assetId}`);
    return assetId;
  }

  public update(assetId: string, properties: Partial<Omit<ImageAssetState, 'id' | 'fileName' | 'dataUrl'>>): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) {
      console.warn(`[ImageAssetManager] Update failed: Asset with ID ${assetId} not found.`);
      return false;
    }

    Object.assign(asset, properties);
    this.notifyUpdates();
    return true;
  }

  public hide(assetId: string): boolean {
    if (!this.assets.has(assetId)) {
      console.warn(`[ImageAssetManager] Hide failed: Asset with ID ${assetId} not found.`);
      return false;
    }

    this.assets.delete(assetId);
    this.notifyUpdates();
    console.log(`[ImageAssetManager] Hidden asset with ID ${assetId}`);
    return true;
  }
}
