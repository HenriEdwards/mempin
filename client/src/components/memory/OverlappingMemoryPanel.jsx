import { useEffect, useMemo, useState } from 'react';
import Input from '../ui/Input.jsx';

function MemoryRow({ memory, onSelect }) {
  const snippet = memory.shortDescription || 'No description yet.';

  return (
    <button
      type="button"
      className="memory-selection__item"
      onClick={() => onSelect(memory)}
    >
      <div
        className={`memory-selection__thumb ${
          memory.hasMedia ? 'memory-selection__thumb--media' : ''
        }`}
      >
        <span>{memory.title.slice(0, 1).toUpperCase()}</span>
      </div>
      <div className="memory-selection__details">
        <h4>{memory.title}</h4>
        <p>{snippet}</p>
      </div>
    </button>
  );
}

function OverlappingMemoryPanel({ group, onSelectMemory, onClose }) {
  const [search, setSearch] = useState('');
  const memories = group?.memories || [];
  const filteredMemories = useMemo(() => {
    if (!search.trim()) return memories;
    const term = search.toLowerCase();
    return memories.filter((memory) =>
      memory.title.toLowerCase().includes(term),
    );
  }, [memories, search]);

  useEffect(() => {
    setSearch('');
  }, [group?.id]);

  if (!group) return null;

  return (
    <div className="memory-selection">
      <div className="memory-selection__header">
        <div>
          <p className="memory-card__meta" style={{ marginBottom: '0.25rem' }}>
            Showing {filteredMemories.length} of {memories.length} memories
          </p>
        </div>
      </div>
      <Input
        placeholder="Search memories"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="memory-selection__list">
        {filteredMemories.length ? (
          filteredMemories.map((memory) => (
            <MemoryRow
              key={memory.id}
              memory={memory}
              onSelect={onSelectMemory}
            />
          ))
        ) : (
          <div className="empty-state">No memories match your search.</div>
        )}
      </div>
    </div>
  );
}

export default OverlappingMemoryPanel;
