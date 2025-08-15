import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ImageAssetState } from '../../plugin-api/asset-types';
import eventBus from '../../core/event-bus';

export const ImageAssetDisplay: React.FC = () => {
  const { imageAssetManager } = useAppContext();
  const [assets, setAssets] = useState<ImageAssetState[]>([]);

  useEffect(() => {
    if (!imageAssetManager) return;

    // Set initial state
    setAssets(imageAssetManager.getAssets());

    const handleAssetsUpdated = (data: { assets: ImageAssetState[] }) => {
      setAssets(data.assets);
    };

    const unsubscribe = eventBus.on('assets:updated', handleAssetsUpdated);

    return () => {
      unsubscribe();
    };
  }, [imageAssetManager]);

  if (assets.length === 0) {
    return null;
  }

  return (
    <>
      {assets.map((asset) => {
        if (!asset.visible) return null;

        const style: React.CSSProperties = {
          position: 'absolute',
          // Convert normalized coordinates (0-1) to percentage for CSS
          top: `${asset.y * 100}%`,
          left: `${asset.x * 100}%`,
          transform: `translate(-50%, -50%) scale(${asset.scale})`,
          opacity: asset.opacity,
          maxWidth: '80vw',
          maxHeight: '80vh',
          zIndex: 100,
          pointerEvents: 'none',
          transition: 'top 0.5s ease-in-out, left 0.5s ease-in-out, transform 0.5s ease-in-out, opacity 0.5s ease-in-out',
        };

        return (
          <img
            key={asset.id}
            src={asset.dataUrl}
            alt={asset.fileName}
            style={style}
          />
        );
      })}
    </>
  );
};
