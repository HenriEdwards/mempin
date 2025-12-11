import { useMemo, useState } from 'react';
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
  canFollowOwner = false,
  isFollowingOwner = false,
  onToggleFollowOwner = null,
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
  const MAX_MEDIA_DISPLAY = 6;

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
      <div className="memory-details__body">
        <div className="memory-details__header">
          <div>
            {memory.shortDescription && (
              <p className="memory-details__lede">{memory.shortDescription}</p>
            )}
          </div>
          {onGenerateQR && (
            <Button variant="outline" onClick={() => onGenerateQR(shareUrl)}>
              Generate QR code
            </Button>
          )}
          {(onNavigate || onToggleSave) && (
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
        {(memory.ownerHandle || memory.ownerName) && (
          <div className="memory-owner-bar">
            <div className="memory-owner-avatar">
              {memory.ownerAvatarUrl ? (
                <img src={memory.ownerAvatarUrl} alt="" />
              ) : (
                <span>{(memory.ownerName || memory.ownerHandle || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="memory-owner-meta">
              <button
                type="button"
                className="link-button"
                onClick={() => onViewProfile?.(memory.ownerHandle)}
                disabled={!memory.ownerHandle}
              >
                @{memory.ownerHandle || 'unknown'}
              </button>
              {memory.ownerName && <span className="muted">{memory.ownerName}</span>}
            </div>
            {canFollowOwner && (
              <Button
                variant={isFollowingOwner ? 'ghost' : 'primary'}
                className="btn-sm"
                onClick={onToggleFollowOwner}
              >
                {isFollowingOwner ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>
        )}
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
            <span>Views</span>
            <strong className="memory-details__stat-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {memory.timesFound}
            </strong>
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
        {imageAssets.length > 0 && (
          <div className="memory-details__section">
            <h4>Gallery</h4>
            <div className="memory-media-row memory-media-row--grid">
              {imageAssets.slice(0, MAX_MEDIA_DISPLAY).map((asset, index) => {
                const remaining = imageAssets.length - MAX_MEDIA_DISPLAY;
                const showOverlay = index === MAX_MEDIA_DISPLAY - 1 && remaining > 0;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    className={`memory-media-thumb ${showOverlay ? 'memory-media-thumb--more' : ''}`}
                    onClick={() => openLightbox(index)}
                  >
                    <img src={asset.url} alt="" />
                    {showOverlay && <span className="memory-media-thumb__overlay">+{remaining}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {audioAssets.length > 0 && (
          <div className="memory-details__section">
            <h4>Audio</h4>
            <div className="memory-audio-list">
              {audioAssets.map((asset, index) => (
                <div className="memory-audio-item" key={asset.id}>
                  <span className="memory-audio-label">Track {index + 1}</span>
                  <audio controls src={asset.url} className="memory-audio-player" />
                </div>
              ))}
            </div>
          </div>
        )}
        {videoAssets.length > 0 && (
          <div className="memory-details__section">
            <h4>Video</h4>
            <div className="memory-media-row memory-media-row--video memory-media-row--grid">
              {videoAssets.slice(0, MAX_MEDIA_DISPLAY).map((asset, index) => {
                const remaining = videoAssets.length - MAX_MEDIA_DISPLAY;
                const showOverlay = index === MAX_MEDIA_DISPLAY - 1 && remaining > 0;
                return (
                  <div
                    key={asset.id}
                    className={`memory-media-thumb memory-media-thumb--video ${showOverlay ? 'memory-media-thumb--more' : ''}`}
                  >
                    <video controls src={asset.url} />
                    {showOverlay && <span className="memory-media-thumb__overlay">+{remaining}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {onOpenExternal && (
        <div className="memory-details__footer">
          <Button
            variant="ghost"
            onClick={() => onOpenExternal(memory)}
            aria-label="View on Google Maps"
          >
            View on Google Maps
          </Button>
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
