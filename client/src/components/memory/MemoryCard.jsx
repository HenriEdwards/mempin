function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function MemoryCard({ memory, variant = 'placed', showFullBody = false }) {
  const timesFound = typeof memory.timesFound === 'number' ? memory.timesFound : 0;
  const hasBody = Boolean(memory.body);
  const bodyText =
    showFullBody || variant === 'placed'
      ? memory.body
      : memory.body?.slice(0, 140);
  return (
    <div className="memory-card">
      <h4 style={{ margin: '0 0 0.5rem' }}>{memory.title}</h4>
      {hasBody && variant === 'found' && (
        <p className="memory-card__body" style={{ margin: '0 0 0.75rem' }}>
          {bodyText}
          {!showFullBody && memory.body.length > 140 ? '...' : ''}
        </p>
      )}
      <div className="memory-card__meta">
        <span>Visibility: {memory.visibility}</span>
        <span>Times found: {timesFound}</span>
      </div>
      {variant === 'found' && memory.unlockedAt && (
        <p className="memory-card__meta" style={{ marginTop: '0.5rem' }}>
          Unlocked: {formatDate(memory.unlockedAt)}
        </p>
      )}
      {variant === 'placed' && memory.createdAt && (
        <p className="memory-card__meta" style={{ marginTop: '0.5rem' }}>
          Created: {formatDate(memory.createdAt)}
        </p>
      )}
    </div>
  );
}

export default MemoryCard;
