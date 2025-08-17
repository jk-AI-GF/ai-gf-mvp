import React, { useEffect, useState } from 'react';
import { VRMMeta, VRM0Meta, VRM1Meta } from '@pixiv/three-vrm';
import * as THREE from 'three';
import styles from './VRMPreviewDialog.module.css';

interface VRMPreviewDialogProps {
  meta: VRMMeta;
  filePath: string;
  onConfirm: (filePath: string) => void;
  onCancel: () => void;
}

const MetaField: React.FC<{ label: string; value?: string | string[] | boolean | null; link?: string }> = ({ label, value, link }) => {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  let displayValue: React.ReactNode;
  if (typeof value === 'boolean') {
    displayValue = value ? <span className={styles.allow}>Allow</span> : <span className={styles.disallow}>Disallow</span>;
  } else if (Array.isArray(value)) {
    displayValue = value.join(', ');
  } else {
    displayValue = value;
  }

  if (link) {
    displayValue = <a href={link} target="_blank" rel="noopener noreferrer">{displayValue}</a>;
  }

  return (
    <p>
      <strong>{label}:</strong> {displayValue}
    </p>
  );
};


const VRMPreviewDialog: React.FC<VRMPreviewDialogProps> = ({
  meta,
  filePath,
  onConfirm,
  onCancel,
}) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    if ('thumbnailImage' in meta && meta.thumbnailImage) {
      const canvas = document.createElement('canvas');
      canvas.width = meta.thumbnailImage.width;
      canvas.height = meta.thumbnailImage.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(meta.thumbnailImage, 0, 0);
      url = canvas.toDataURL('image/png');
      setThumbnail(url);
    } else if ('texture' in meta && meta.texture) {
      const texture = meta.texture as THREE.Texture;
      const image = texture.image as HTMLImageElement | HTMLCanvasElement;
      if (image) {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(image, 0, 0);
        url = canvas.toDataURL('image/png');
        setThumbnail(url);
      }
    }
    return () => {};
  }, [meta]);

  const handleConfirm = () => onConfirm(filePath);

  const isV1 = 'name' in meta;
  const v1Meta = isV1 ? (meta as VRM1Meta) : null;
  const v0Meta = !isV1 ? (meta as VRM0Meta) : null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h2 className={styles.title}>Load VRM</h2>
        <div className={styles.content}>
          {thumbnail ? (
            <img src={thumbnail} alt="VRM Thumbnail" className={styles.thumbnail} />
          ) : (
            <div className={`${styles.thumbnail} ${styles.noThumbnail}`}>No Preview</div>
          )}
          <div className={styles.info}>
            <MetaField label="Title" value={v1Meta?.name || v0Meta?.title} />
            <MetaField label="Author(s)" value={v1Meta?.authors || v0Meta?.author} />
            <MetaField label="Version" value={v1Meta?.version || v0Meta?.version} />
            <p className={styles.filePath}>
              <strong>File:</strong> {filePath}
            </p>
          </div>
        </div>

        <div className={styles.details}>
          <h3 className={styles.subtitle}>Permissions (VRM {meta.metaVersion}.0)</h3>
          {isV1 && v1Meta && (
            <>
              <MetaField label="Avatar Permission" value={v1Meta.avatarPermission} />
              <MetaField label="Commercial Usage" value={v1Meta.commercialUsage} />
              <MetaField label="Allow Redistribution" value={v1Meta.allowRedistribution} />
              <MetaField label="Credit Notation" value={v1Meta.creditNotation} />
              <MetaField label="Modification" value={v1Meta.modification} />
              <hr className={styles.separator} />
              <MetaField label="Excessively Violent" value={v1Meta.allowExcessivelyViolentUsage} />
              <MetaField label="Excessively Sexual" value={v1Meta.allowExcessivelySexualUsage} />
              <MetaField label="Political/Religious" value={v1Meta.allowPoliticalOrReligiousUsage} />
              <MetaField label="Antisocial/Hate" value={v1Meta.allowAntisocialOrHateUsage} />
            </>
          )}
          {!isV1 && v0Meta && (
            <>
              <MetaField label="Allowed User" value={v0Meta.allowedUserName} />
              <MetaField label="Violent Usage" value={v0Meta.violentUssageName} />
              <MetaField label="Sexual Usage" value={v0Meta.sexualUssageName} />
              <MetaField label="Commercial Usage" value={v0Meta.commercialUssageName} />
              <MetaField label="License" value={v0Meta.licenseName} link={v0Meta.otherLicenseUrl} />
            </>
          )}
        </div>

        <p className={styles.confirmMessage}>Would you like to load this model?</p>
        <div className={styles.buttons}>
          <button onClick={onCancel} className={`${styles.button} ${styles.cancelButton}`}>
            Cancel
          </button>
          <button onClick={handleConfirm} className={`${styles.button} ${styles.confirmButton}`}>
            Load
          </button>
        </div>
      </div>
    </div>
  );
};

export default VRMPreviewDialog;