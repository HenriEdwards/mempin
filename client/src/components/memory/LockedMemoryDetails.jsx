import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

function formatDateTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function buildPlaceholders(count, assets = []) {
  if (assets.length) return assets;
  const safeCount = Math.max(0, Math.min(count || 0, 3));
  return Array.from({ length: safeCount }).map((_, index) => ({ id: `placeholder-${index}` }));
}

function LockedMemoryDetails({
  memory,
  canAttemptUnlock,
  isUnlocking,
  error,
  passcode,
  onPasscodeChange,
  onUnlock,
  locationStatus = { required: false, withinRadius: true, hasLocation: true, distance: null },
  followerStatus = { required: false, allowed: true },
  onRetryLocation,
  onViewProfile,
  canFollowOwner = false,
  isFollowingOwner = false,
  onToggleFollowOwner = null,
}) {
  if (!memory) return null;

  const requiresLocation = memory.unlockRequiresLocation !== false;
  const requiresFollowers = memory.unlockRequiresFollowers;
  const requiresPasscode = memory.unlockRequiresPasscode;
  const unlockAvailableFrom = memory.unlockAvailableFrom ? new Date(memory.unlockAvailableFrom) : null;
  const isTimeLocked = unlockAvailableFrom && unlockAvailableFrom.getTime() > Date.now();

  const assets = memory.assets || [];
  const imageAssets = assets.filter((asset) => asset.type === 'image');
  const audioAssets = assets.filter((asset) => asset.type === 'audio');
  const videoAssets = assets.filter((asset) => asset.type === 'video');

  const safePasscode = passcode || '';
  const radiusM = memory.radiusM ?? 0;
  const imageCount =
    imageAssets.length || Number(memory.imageCount ?? 0) || (memory.hasMedia ? 1 : 0);
  const audioCount =
    audioAssets.length || Number(memory.audioCount ?? 0) || (memory.hasMedia ? 0 : 0);
  const videoCount =
    videoAssets.length || Number(memory.videoCount ?? 0) || (memory.hasMedia ? 0 : 0);

  const imagePlaceholders = buildPlaceholders(imageCount, imageAssets);
  const audioPlaceholders = buildPlaceholders(audioCount, audioAssets);
  const videoPlaceholders = buildPlaceholders(videoCount, videoAssets);

  const unlockMethod = [
    requiresLocation ? 'Location' : null,
    requiresFollowers ? 'Followers' : null,
    requiresPasscode ? 'Passcode' : null,
  ]
    .filter(Boolean)
    .join(' + ') || 'None';

  const unlockDisabled =
    isUnlocking ||
    !canAttemptUnlock ||
    isTimeLocked ||
    (requiresPasscode && !safePasscode.trim()) ||
    (requiresLocation && !locationStatus.withinRadius) ||
    (requiresFollowers && !followerStatus.allowed);

  const helperText = (() => {
    if (!canAttemptUnlock) return 'Sign in to unlock memories.';
    if (isTimeLocked) return `Available ${formatDateTime(unlockAvailableFrom)}`;
    if (requiresLocation && !locationStatus.withinRadius) {
      if (!locationStatus.hasLocation) return 'Share location to unlock.';
      return 'Move closer to this pin to unlock.';
    }
    if (requiresFollowers && !followerStatus.allowed) {
      return 'Only followers can unlock this memory.';
    }
    if (requiresPasscode && !safePasscode.trim()) return 'Enter the passcode to continue.';
    return '';
  })();

  return (
    <div className="memory-details locked-memory">
      <div className="locked-memory__hero">
        <div className="locked-memory__icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3Zm-7-2a2 2 0 0 1 4 0v2h-4V6Zm8 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7Z" />
          </svg>
        </div>
        <div>
          <p className="locked-memory__eyebrow">Locked memory</p>
          <p className="locked-memory__title">{memory.title}</p>
          {memory.shortDescription && <p className="muted">{memory.shortDescription}</p>}
          {(memory.ownerHandle || memory.ownerName) && (
            <p className="locked-memory__owner">
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
          {unlockAvailableFrom && (
            <p className="muted">Available from {formatDateTime(unlockAvailableFrom)}</p>
          )}
        </div>
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

      <div className="locked-memory__requirements">
        {requiresLocation && (
          <div
            className={`locked-memory__requirement ${locationStatus.withinRadius ? 'ok' : 'blocked'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s7-5.433 7-12a7 7 0 1 0-14 0c0 6.567 7 12 7 12Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>
              {locationStatus.hasLocation
                ? locationStatus.withinRadius
                  ? 'In range'
                  : 'Out of range'
                : 'Location required'}
            </span>
            {locationStatus.distance !== null && Number.isFinite(locationStatus.distance) && (
              <span className="muted">~{Math.round(locationStatus.distance)} m away</span>
            )}
            {!locationStatus.hasLocation && onRetryLocation && (
              <button
                type="button"
                className="link-button locked-memory__link"
                onClick={onRetryLocation}
              >
                Refresh location
              </button>
            )}
          </div>
        )}
        {requiresFollowers && (
          <div className={`locked-memory__requirement ${followerStatus.allowed ? 'ok' : 'blocked'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
              <path d="M6 21v-1a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v1" />
            </svg>
            <span>{followerStatus.allowed ? 'Follower access' : 'Followers only'}</span>
          </div>
        )}
        {requiresPasscode && (
          <div className="locked-memory__requirement ok">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="M18 11h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h1" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" />
            </svg>
            <span>Passcode required</span>
          </div>
        )}
        {isTimeLocked && (
          <div className="locked-memory__requirement blocked">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
            <span>Opens {formatDateTime(unlockAvailableFrom)}</span>
          </div>
        )}
      </div>

      {imagePlaceholders.length > 0 && (
        <div className="memory-details__section">
          <h4>Gallery</h4>
          <div className="memory-details__gallery locked-media__grid">
            {imagePlaceholders.map((asset, index) => (
              <div key={asset.id || index} className="locked-media locked-media--image">
                {asset.url ? <img src={asset.url} alt="" /> : <div className="locked-media__placeholder" />}
                <div className="locked-media__veil">Locked</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {audioPlaceholders.length > 0 && (
        <div className="memory-details__section">
          <h4>Audio</h4>
          <div className="locked-media__stack">
            {audioPlaceholders.map((asset, index) => (
              <div key={asset.id || index} className="locked-media locked-media--audio">
                <div className="locked-media__placeholder locked-media__placeholder--audio">
                  <span>Track {index + 1}</span>
                </div>
                <div className="locked-media__veil">Locked</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {videoPlaceholders.length > 0 && (
        <div className="memory-details__section">
          <h4>Video</h4>
          <div className="locked-media__stack">
            {videoPlaceholders.map((asset, index) => (
              <div key={asset.id || index} className="locked-media locked-media--video">
                {asset.url ? (
                  <video src={asset.url} />
                ) : (
                  <div className="locked-media__placeholder locked-media__placeholder--video" />
                )}
                <div className="locked-media__veil">Locked</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="locked-memory__actions">
        {requiresPasscode && (
          <div className="locked-memory__passcode">
            <Input
              label="Passcode"
              type="password"
              value={safePasscode}
              onChange={(event) => onPasscodeChange?.(event.target.value)}
              placeholder="Enter passcode"
            />
          </div>
        )}
        <Button
          variant="primary"
          disabled={unlockDisabled}
          onClick={() => onUnlock?.(safePasscode)}
        >
          {isUnlocking ? 'Unlocking...' : 'Unlock memory'}
        </Button>
        {helperText && <p className="muted">{helperText}</p>}
        {error && <p className="locked-memory__error">{error}</p>}
      </div>
    </div>
  );
}

export default LockedMemoryDetails;
