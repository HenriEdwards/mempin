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
          <span>Radius: {memory.radiusM}m</span>
          <span>Found {memory.timesFound} times</span>
        </p>
        <p className="memory-card__body">
          This memory is locked. Walk within the highlighted radius to unlock it.
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
