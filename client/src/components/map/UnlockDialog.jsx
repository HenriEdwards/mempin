import Button from '../ui/Button.jsx';

function UnlockDialog({
  memory,
  onUnlock,
  onClose,
  canUnlock,
  isUnlocking,
  error,
}) {
  if (!memory) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <h3>{memory.title}</h3>
        <p className="memory-card__meta">
          <p className="memory-radiius flex gap-2 items-center">
            <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor" aria-hidden="true">
              <path d="m360-160-56-56 70-72q-128-17-211-70T80-480q0-83 115.5-141.5T480-680q169 0 284.5 58.5T880-480q0 62-66.5 111T640-296v-82q77-20 118.5-49.5T800-480q0-32-85.5-76T480-600q-149 0-234.5 44T160-480q0 24 51 57.5T356-372l-52-52 56-56 160 160-160 160Z" />
            </svg>
            <span>{memory.radiusM}m</span>
          </p>
          {/* <span>Found {memory.timesFound} times</span> */}
        </p>
        <p className="memory-card__body memory-locked">
          <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 24 24" width="16" fill="currentColor" aria-hidden="true">
            <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm6-7h-1V7a5 5 0 0 0-10 0v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-9-3a3 3 0 0 1 6 0v3H9V7Zm9 12H6v-7h12v7Z" />
          </svg>
        </p>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <span
            className="tooltip-anchor"
            data-tooltip={canUnlock ? null : 'Sign in to unlock memories'}
          >
            <Button
              variant="primary"
              disabled={!canUnlock || isUnlocking}
              onClick={onUnlock}
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock memory'}
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

export default UnlockDialog;
