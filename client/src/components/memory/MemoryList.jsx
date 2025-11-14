import MemoryCard from './MemoryCard.jsx';

function MemoryList({ items = [], variant = 'placed', emptyState }) {
  if (!items.length) {
    return <div className="empty-state">{emptyState}</div>;
  }

  return (
    <div className="memory-list">
      {items.map((memory) => (
        <MemoryCard key={memory.id} memory={memory} variant={variant} />
      ))}
    </div>
  );
}

export default MemoryList;
