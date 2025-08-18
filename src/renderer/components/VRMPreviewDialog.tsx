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
  const { t } = useTranslation();
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  let displayValue: React.ReactNode;
  if (typeof value === 'boolean') {
    displayValue = value ? <span className={styles.allow}>{t('vrmPreviewDialog.allow')}</span> : <span className={styles.disallow}>{t('vrmPreviewDialog.disallow')}</span>;
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
  const { t } = useTranslation();
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
        <h2 className={styles.title}>{t('vrmPreviewDialog.title')}</h2>
        <div className={styles.content}>
          {thumbnail ? (
            <img src={thumbnail} alt="VRM Thumbnail" className={styles.thumbnail} />
          ) : (
            <div className={`${styles.thumbnail} ${styles.noThumbnail}`}>{t('vrmPreviewDialog.noPreview')}</div>
          )}
          <div className={styles.info}>
            <MetaField label={t('vrmPreviewDialog.metaTitle')} value={v1Meta?.name || v0Meta?.title} />
            <MetaField label={t('vrmPreviewDialog.metaAuthors')} value={v1Meta?.authors || v0Meta?.author} />
            <MetaField label={t('vrmPreviewDialog.metaVersion')} value={v1Meta?.version || v0Meta?.version} />
            <p className={styles.filePath}>
              <strong>{t('vrmPreviewDialog.metaFile')}:</strong> {filePath}
            </p>
          </div>
        </div>

        <div className={styles.details}>
          <h3 className={styles.subtitle}>{t('vrmPreviewDialog.permissionsTitle', { version: meta.metaVersion })}</h3>
          {isV1 && v1Meta && (
            <>
              <MetaField label={t('vrmPreviewDialog.v1.avatarPermission')} value={v1Meta.avatarPermission} />
              <MetaField label={t('vrmPreviewDialog.v1.commercialUsage')} value={v1Meta.commercialUsage} />
              <MetaField label={t('vrmPreviewDialog.v1.allowRedistribution')} value={v1Meta.allowRedistribution} />
              <MetaField label={t('vrmPreviewDialog.v1.creditNotation')} value={v1Meta.creditNotation} />
              <MetaField label={t('vrmPreviewDialog.v1.modification')} value={v1Meta.modification} />
              <hr className={styles.separator} />
              <MetaField label={t('vrmPreviewDialog.v1.allowExcessivelyViolentUsage')} value={v1Meta.allowExcessivelyViolentUsage} />
              <MetaField label={t('vrmPreviewDialog.v1.allowExcessivelySexualUsage')} value={v1Meta.allowExcessivelySexualUsage} />
              <MetaField label={t('vrmPreviewDialog.v1.allowPoliticalOrReligiousUsage')} value={v1Meta.allowPoliticalOrReligiousUsage} />
              <MetaField label={t('vrmPreviewDialog.v1.allowAntisocialOrHateUsage')} value={v1Meta.allowAntisocialOrHateUsage} />
            </>
          )}
          {!isV1 && v0Meta && (
            <>
              <MetaField label={t('vrmPreviewDialog.v0.allowedUserName')} value={v0Meta.allowedUserName} />
              <MetaField label={t('vrmPreviewDialog.v0.violentUssageName')} value={v0Meta.violentUssageName} />
              <MetaField label={t('vrmPreviewDialog.v0.sexualUssageName')} value={v0Meta.sexualUssageName} />
              <MetaField label={t('vrmPreviewDialog.v0.commercialUssageName')} value={v0Meta.commercialUssageName} />
              <MetaField label={t('vrmPreviewDialog.v0.licenseName')} value={v0Meta.licenseName} link={v0Meta.otherLicenseUrl} />
            </>
          )}
        </div>

        <p className={styles.confirmMessage}>{t('vrmPreviewDialog.confirmMessage')}</p>
        <div className={styles.buttons}>
          <button onClick={onCancel} className={`${styles.button} ${styles.cancelButton}`}>
            {t('vrmPreviewDialog.cancel')}
          </button>
          <button onClick={handleConfirm} className={`${styles.button} ${styles.confirmButton}`}>
            {t('vrmPreviewDialog.load')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VRMPreviewDialog;