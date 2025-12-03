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

function formatExpiry(value) {
  if (!value) return 'Forever';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Forever';
  const formatted = new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
  return date.getTime() <= Date.now() ? `Expired · ${formatted}` : formatted;
}

function MemoryDetailsContent({
  memory,
  onGenerateQR,
  onViewProfile,
  onNavigate,
  onOpenExternal,
  onToggleSave,
}) {
  if (!memory) return null;
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const imageAssets = useMemo(
    () => (memory.assets || []).filter((asset) => asset.type === 'image'),
    [memory.assets],
  );
  const audioAssets = (memory.assets || []).filter((asset) => asset.type === 'audio');
  const videoAssets = (memory.assets || []).filter((asset) => asset.type === 'video');
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
        {(onOpenExternal || onNavigate || onToggleSave) && (
          <div className="memory-details__actions">
            {onToggleSave && (
              <label className="save-memory-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(memory.saved)}
                  onChange={(event) => onToggleSave(memory, event.target.checked)}
                />
                <span>{memory.saved ? 'Memory saved' : 'Save memory'}</span>
              </label>
            )}
            {onOpenExternal && (
              <Button
                variant="ghost"
                onClick={() => onOpenExternal(memory)}
                aria-label="View on Google Maps"
              >
                View on Google Maps
              </Button>
            )}
            {onNavigate && (
              <Button
                variant="primary"
                onClick={() => onNavigate(memory)}
                aria-label="Navigate to this memory"
              >
                Navigate
              </Button>
            )}
          </div>
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
        <div>
          <span>Expires</span>
          <strong>{formatExpiry(memory.expiresAt)}</strong>
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
      {videoAssets.length > 0 && (
        <div className="memory-details__section">
          <h4>Video</h4>
          <div className="memory-details__videos">
            {videoAssets.map((asset) => (
              <video key={asset.id} controls src={asset.url} style={{ maxWidth: '100%', borderRadius: '0.5rem' }} />
            ))}
          </div>
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
