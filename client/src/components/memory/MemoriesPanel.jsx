import { useMemo, useState } from 'react';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import Input from '../ui/Input.jsx';

function formatRelative(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

function MemoriesPanel({
  isOpen,
  onClose,
  placedMemories,
  foundMemories,
  onSelectMemory,
}) {
  const [tab, setTab] = useState('placed');
  const [search, setSearch] = useState('');

  const { items, total } = useMemo(() => {
    const source = tab === 'placed' ? placedMemories : foundMemories;
    const filtered = source.filter((memory) => {
      const haystack = `${memory.title} ${memory.shortDescription || ''} ${
        memory.tags?.join(' ') || ''
      }`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
    return { items: filtered, total: source.length };
  }, [tab, placedMemories, foundMemories, search]);

  return (
    <SlidingPanel isOpen={isOpen} onClose={onClose} title="Memories" width="420px">
      <div className="memories-panel">
        <div className="tabs tabs--segmented">
          <button
            type="button"
            className={`tab-button ${tab === 'placed' ? 'active' : ''}`}
            onClick={() => setTab('placed')}
          >
            Placed
          </button>
          <button
            type="button"
            className={`tab-button ${tab === 'found' ? 'active' : ''}`}
            onClick={() => setTab('found')}
          >
            Found
          </button>
        </div>
        <Input
          placeholder="Search memories..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <p className="memories-panel__count">
          Showing {items.length} of {total} memories
        </p>
        <div className="memories-panel__list">
          {items.map((memory) => (
            <button
              key={memory.id}
              type="button"
              className="memories-panel__item"
              onClick={() => onSelectMemory(memory)}
            >
              <div>
                <div className="memories-panel__item-header">
                  <h4>{memory.title}</h4>
                  <span className={`pill visibility-${memory.visibility}`}>
                    {memory.visibility}
                  </span>
                </div>
                <p className="memories-panel__preview">
                  {memory.shortDescription ||
                    memory.body?.slice(0, 80) ||
                    'No preview available'}
                </p>
              </div>
              <div className="memories-panel__meta">
                <span>Unlocked {memory.timesFound} times</span>
                <span>
                  {tab === 'found'
                    ? `Unlocked ${formatRelative(memory.unlockedAt)}`
                    : `Last view ${formatRelative(memory.lastUnlockedAt)}`}
                </span>
              </div>
            </button>
          ))}
          {!items.length && <div className="empty-state">No memories match.</div>}
        </div>
      </div>
    </SlidingPanel>
  );
}

export default MemoriesPanel;
