import { useMemo, useState } from 'react';
import MemoryMiniMap from './MemoryMiniMap.jsx';
import Button from '../ui/Button.jsx';

function formatDate(value) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function MemoryDetailsContent({ memory, onGenerateQR, onViewProfile }) {
  if (!memory) return null;
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const imageAssets = useMemo(
    () => (memory.assets || []).filter((asset) => asset.type === 'image'),
    [memory.assets],
  );
  const audioAssets = (memory.assets || []).filter((asset) => asset.type === 'audio');
  const shareUrl = `${window.location.origin}/m/${memory.id}`;

  const openLightbox = (index) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const showPrev = () => {
    if (!imageAssets.length) return;
    setLightboxIndex((prev) => {
      const next = typeof prev === 'number' ? (prev - 1 + imageAssets.length) % imageAssets.length : 0;
      return next;
    });
  };

  const showNext = () => {
    if (!imageAssets.length) return;
    setLightboxIndex((prev) => {
      const next = typeof prev === 'number' ? (prev + 1) % imageAssets.length : 0;
      return next;
    });
  };

  const activeImage = typeof lightboxIndex === 'number' ? imageAssets[lightboxIndex] : null;

  return (
    <div className="memory-details">
      <div className="memory-details__header">
        <div>
          <h2>{memory.title}</h2>
          {memory.shortDescription && <p>{memory.shortDescription}</p>}
          {(memory.ownerHandle || memory.ownerName) && (
            <p className="memory-details__owner">
              by{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => onViewProfile?.(memory.ownerHandle)}
                disabled={!memory.ownerHandle}
              >
                {memory.ownerName || memory.ownerHandle}
                {memory.ownerHandle ? ` (@${memory.ownerHandle})` : ''}
              </button>
            </p>
          )}
        </div>
        {onGenerateQR && (
          <Button variant="outline" onClick={() => onGenerateQR(shareUrl)}>
            Generate QR code
          </Button>
        )}
      </div>
      <div className="memory-details__stats">
        <div>
          <span>Visibility</span>
          <strong>{memory.visibility}</strong>
        </div>
        <div>
          <span>Radius</span>
          <strong>{memory.radiusM} m</strong>
        </div>
        <div>
          <span>Unlocked</span>
          <strong>{memory.timesFound}</strong>
        </div>
        <div>
          <span>Last unlocked</span>
          <strong>{formatDate(memory.lastUnlockedAt)}</strong>
        </div>
      </div>
      {memory.journeyId && (
        <div className="memory-details__journey">
          Part {memory.journeyStep || 1}
          {memory.journeyStepCount ? ` of ${memory.journeyStepCount}` : ''} in this journey
        </div>
      )}
      {memory.tags?.length > 0 && (
        <div className="memory-details__tags">
          {memory.tags.map((tag) => (
            <span key={tag} className="chip">
              #{tag}
            </span>
          ))}
        </div>
      )}
      {memory.body && (
        <div className="memory-details__section">
          <h4>Story</h4>
          <p>{memory.body}</p>
        </div>
      )}
      <div className="memory-details__section">
        <h4>Location</h4>
        <MemoryMiniMap
          latitude={memory.latitude}
          longitude={memory.longitude}
          radiusM={memory.radiusM}
        />
      </div>
      {imageAssets.length > 0 && (
        <div className="memory-details__section">
          <h4>Gallery</h4>
          <div className="memory-details__gallery">
            {imageAssets.map((asset, index) => (
              <button
                key={asset.id}
                type="button"
                className="memory-details__thumb"
                onClick={() => openLightbox(index)}
              >
                <img src={asset.url} alt="" />
              </button>
            ))}
          </div>
        </div>
      )}
      {audioAssets.length > 0 && (
        <div className="memory-details__section">
          <h4>Audio</h4>
          {audioAssets.map((asset) => (
            <audio key={asset.id} controls src={asset.url} />
          ))}
        </div>
      )}
      {activeImage && (
        <div className="image-lightbox" role="presentation" onClick={closeLightbox}>
          <div className="image-lightbox__inner" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="image-lightbox__close"
              aria-label="Close"
              onClick={closeLightbox}
            >
              ×
            </button>
            {imageAssets.length > 1 && (
              <>
                <button
                  type="button"
                  className="image-lightbox__nav image-lightbox__nav--prev"
                  aria-label="Previous image"
                  onClick={showPrev}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="image-lightbox__nav image-lightbox__nav--next"
                  aria-label="Next image"
                  onClick={showNext}
                >
                  ›
                </button>
              </>
            )}
            <div className="image-lightbox__media">
              <img src={activeImage.url} alt={memory.title || 'Memory image'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemoryDetailsContent;
