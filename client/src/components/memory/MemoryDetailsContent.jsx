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
  onOpenJourney,
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
  const visibilityIcon =
    memory.visibility === 'private'
      ? 'lock'
      : memory.visibility === 'followers'
        ? 'groups'
        : memory.visibility === 'unlisted'
          ? 'link'
          : 'public';
  const expiryText = formatExpiry(memory.expiresAt);
  const radiusValue = Number(memory.radiusM);
  const radiusText = Number.isFinite(radiusValue) ? `${radiusValue} m` : 'N/A';
  const viewCountValue = Number(memory.timesFound);
  const viewCount = Number.isFinite(viewCountValue) ? viewCountValue : 0;
  const saveToggle = onToggleSave ? (
    <div className="memory-details__save">
      <label className="save-memory-toggle">
        <input
          type="checkbox"
          checked={Boolean(memory.saved)}
          onChange={(event) => onToggleSave(memory, event.target.checked)}
        />
        <span>{memory.saved ? 'Memory saved' : 'Save memory'}</span>
      </label>
    </div>
  ) : null;
  const journeyButton =
    memory.journeyId &&
    (onOpenJourney ? (
      <button
        type="button"
        className="memory-owner-journey"
        onClick={() =>
          onOpenJourney(memory.journeyId, memory.journeyTitle || 'Journey', memory.ownerHandle)
        }
        aria-label={`Open journey ${memory.journeyTitle || 'Journey'}`}
      >
        <span className="memory-owner-journey__title">{memory.journeyTitle || 'Journey'}</span>
        {Number.isFinite(memory.journeyStep) && (
          <span className="memory-owner-journey__steps">
            Step {memory.journeyStep}
            {memory.journeyStepCount ? ` of ${memory.journeyStepCount}` : ''}
          </span>
        )}
      </button>
    ) : null);

  return (
    <div className="memory-details">
      <div className="memory-details__body">
        {(onGenerateQR || onNavigate) && (
          <div className="memory-details__header">
            <div />
            <div className="memory-details__actions">
              {onGenerateQR && (
                <Button variant="outline" onClick={() => onGenerateQR(shareUrl)}>
                  Generate QR code
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
          </div>
        )}
        {(memory.ownerHandle || memory.ownerName) && (
          <div className="memory-owner-bar">
            <div className="memory-owner-info">
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
            </div>
            {(journeyButton || canFollowOwner) && (
              <div className="memory-owner-actions">
                {journeyButton}
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
          </div>
        )}
        <div className="memory-details__stats">
          <div
            className="memory-details__stat"
            aria-label={`Visibility: ${memory.visibility}`}
            title={`Visibility: ${memory.visibility}`}
          >
            <span className="memory-details__stat-icon material-symbols-rounded" aria-hidden="true">
              {visibilityIcon}
            </span>
            <strong>{memory.visibility}</strong>
          </div>
          <div
            className="memory-details__stat"
            aria-label={`Radius: ${radiusText}`}
            title={`Radius: ${radiusText}`}
          >
            <span className="memory-details__stat-icon material-symbols-rounded" aria-hidden="true">
              near_me
            </span>
            <strong>{radiusText}</strong>
          </div>
          <div
            className="memory-details__stat"
            aria-label={`Views: ${viewCount}`}
            title={`Views: ${viewCount}`}
          >
            <span className="memory-details__stat-icon material-symbols-rounded" aria-hidden="true">
              visibility
            </span>
            <strong>{viewCount}</strong>
          </div>
          <div
            className="memory-details__stat"
            aria-label={`Expires: ${expiryText}`}
            title={`Expires: ${expiryText}`}
          >
            <span className="memory-details__stat-icon material-symbols-rounded" aria-hidden="true">
              hourglass_bottom
            </span>
            <strong>{expiryText}</strong>
          </div>
        </div>
        {memory.shortDescription && (
          <>
            <hr className="memory-details__divider" />
            <p className="memory-details__lede">{memory.shortDescription}</p>
            <hr className="memory-details__divider" />
          </>
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
      {(onOpenExternal || saveToggle) && (
        <div className={`memory-details__footer ${saveToggle ? 'memory-details__footer--with-save' : ''}`}>
          {saveToggle}
          {onOpenExternal && (
            <Button
              variant="ghost"
              onClick={() => onOpenExternal(memory)}
              aria-label="View on Google Maps"
            >
              View on Google Maps
            </Button>
          )}
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
