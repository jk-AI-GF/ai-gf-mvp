/**
 * @file Defines the state structure for 2D image assets displayed on screen.
 */

export interface ImageAssetState {
  id: string;
  fileName: string;
  dataUrl: string;
  visible: boolean;
  x: number; // Position X (0.0 to 1.0 as screen width percentage)
  y: number; // Position Y (0.0 to 1.0 as screen height percentage)
  scale: number; // Multiplier (1.0 is original size)
  opacity: number; // 0.0 to 1.0
  // Add other properties for animation, rotation, etc. in the future
}
