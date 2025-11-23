import { useEffect, useMemo, useState } from 'react';
import SlidingPanel from '../layout/SlidingPanel.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';

function visibilitySummary(set) {
  if (!set || !set.size) return 'unknown';
  if (set.size > 1) return 'mixed';
  const [single] = Array.from(set);
  return single;
}

function JourneysPanel({
  isOpen,
  onClose,
  journeys,
  journeyVisibilityMap,
  journeyMemories,
  onSelectJourney,
  onChangeJourneyVisibility,
  onSelectMemory,
  loadingJourneyId,
}) {
  const [search, setSearch] = useState('');
  const [selectedJourneyId, setSelectedJourneyId] = useState(null);

  const filteredJourneys = useMemo(() => {
    const query = search.toLowerCase();
    return journeys.filter(
      (journey) =>
        journey.title.toLowerCase().includes(query) ||
        (journey.description || '').toLowerCase().includes(query),
    );
  }, [journeys, search]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedJourneyId(null);
      setSearch('');
      return;
    }
    if (!selectedJourneyId && filteredJourneys.length) {
      const firstId = filteredJourneys[0].id;
      setSelectedJourneyId(firstId);
      onSelectJourney?.(firstId);
    }
  }, [isOpen, filteredJourneys, selectedJourneyId, onSelectJourney]);

  useEffect(() => {
    if (
      selectedJourneyId &&
      !filteredJourneys.find((journey) => journey.id === selectedJourneyId) &&
      filteredJourneys.length
    ) {
      const firstId = filteredJourneys[0].id;
      setSelectedJourneyId(firstId);
      onSelectJourney?.(firstId);
    }
  }, [filteredJourneys, selectedJourneyId, onSelectJourney]);

  const currentMemories = selectedJourneyId
    ? journeyMemories[selectedJourneyId]?.memories || []
    : [];
  const currentVisibility = visibilitySummary(
    journeyVisibilityMap[selectedJourneyId]?.size
      ? journeyVisibilityMap[selectedJourneyId]
      : new Set(currentMemories.map((memory) => memory.visibility)),
  );
  const normalizedVisibility = ['public', 'followers', 'unlisted', 'private', 'mixed'].includes(
    currentVisibility,
  )
    ? currentVisibility
    : 'mixed';
  const isLoading = loadingJourneyId && loadingJourneyId === selectedJourneyId;

  return (
    <SlidingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Journeys"
      width="480px"
    >
      <div className="memories-panel journeys-panel">
        <Input
          placeholder="Search journeys..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <p className="memories-panel__count">
          Showing {filteredJourneys.length} of {journeys.length} journeys
        </p>
        <div className="memories-panel__list">
          {filteredJourneys.map((journey) => {
            const selected = journey.id === selectedJourneyId;
            const summaryVisibility = visibilitySummary(
              journeyVisibilityMap[journey.id],
            );
            return (
              <button
                key={journey.id}
                type="button"
                className={`memories-panel__item ${selected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedJourneyId(journey.id);
                  onSelectJourney?.(journey.id);
                }}
              >
                <div className="memories-panel__item-header">
                  <h4>{journey.title}</h4>
                  <span className="pill">
                    {journey.stepCount} step{journey.stepCount === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="memories-panel__preview">
                  {journey.description || 'No description yet'}
                </p>
                <div className="journey-meta">
                  <span>
                    Visibility:{' '}
                    {summaryVisibility === 'mixed'
                      ? 'mixed'
                      : summaryVisibility || 'unknown'}
                  </span>
                </div>
              </button>
            );
          })}
          {!filteredJourneys.length && (
            <div className="empty-state">No journeys found.</div>
          )}
        </div>

        {selectedJourneyId && (
          <div className="journey-details">
            <div className="journey-details__header">
              <h4>Journey memories</h4>
              <Select
                value={normalizedVisibility}
                onChange={(event) =>
                  onChangeJourneyVisibility?.(selectedJourneyId, event.target.value)
                }
                disabled={isLoading}
              >
                <option value="mixed" disabled>
                  Visibility varies
                </option>
                <option value="public">public</option>
                <option value="followers">followers</option>
                <option value="unlisted">unlisted</option>
                <option value="private">private</option>
              </Select>
            </div>
            {isLoading && <p className="muted">Loading journey memories...</p>}
            {!isLoading && (
              <div className="memories-panel__list">
                {currentMemories.map((memory) => (
                  <button
                    key={memory.id}
                    type="button"
                    className="memories-panel__item"
                    onClick={() => onSelectMemory?.(memory)}
                  >
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
                    <div className="memories-panel__meta">
                      <span>Step {memory.journeyStep || '-'}</span>
                      <span>Unlocked {memory.timesFound} times</span>
                    </div>
                  </button>
                ))}
                {!currentMemories.length && (
                  <div className="empty-state">No memories in this journey.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </SlidingPanel>
  );
}

export default JourneysPanel;
