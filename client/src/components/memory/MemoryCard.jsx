function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function MemoryCard({ memory, variant = 'placed' }) {
  const timesFound = typeof memory.timesFound === 'number' ? memory.timesFound : 0;
  const summary = memory.shortDescription || '';
  return (
    <div className="memory-card">
      <h4 style={{ margin: '0 0 0.5rem' }}>{memory.title}</h4>
      {summary && (
        <p className="memory-card__body" style={{ margin: '0 0 0.75rem' }}>
          {summary}
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
