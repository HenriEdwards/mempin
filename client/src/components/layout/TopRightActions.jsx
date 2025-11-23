import Button from '../ui/Button.jsx';
import { useUI } from '../../context/UIContext.jsx';
import Input from '../ui/Input.jsx';

const VISIBILITY_OPTIONS = ['public', 'followers', 'unlisted', 'private'];

function TopRightActions({
  filters,
  isFilterOpen,
  onToggleFilter,
  onResetFilters,
  onSelectOwnership,
  onSelectJourneyType,
  onSelectMedia,
  onToggleVisibilityFilter,
  onSearchChange,
}) {
  const { openMemoriesPanel, openJourneysPanel, openFollowersPanel, activePanel } = useUI();
  const visibilitySet = filters?.visibilities || new Set(VISIBILITY_OPTIONS);
  const isPanelOpen = Boolean(activePanel);
  const panelWidthMap = {
    memories: '480px',
    followers: '480px',
    profile: '480px',
    journeys: '480px',
    userProfile: '480px',
  };
  const defaultPanelWidth = '480px';
  const activePanelWidth = panelWidthMap[activePanel] || defaultPanelWidth;
  const actionOffset = isPanelOpen ? `calc(${activePanelWidth} + 1.5rem)` : '1.5rem';

  return (
    <div className={`map-actions ${isPanelOpen ? 'map-actions--panel-open' : ''}`} style={{ right: actionOffset }}>
      <Button variant="ghost" onClick={openMemoriesPanel}>
        Memories
      </Button>
      <Button variant="ghost" onClick={openFollowersPanel}>
        Following
      </Button>
      <Button variant="ghost" onClick={openJourneysPanel}>
        Journeys
      </Button>
      <div className="filter-wrapper">
        <Button variant="ghost" onClick={onToggleFilter}>
          Filter by
        </Button>
        {isFilterOpen && (
          <div className="filter-card">
            <div className="filter-card__row">
              <div className="filter-card__label">Visibility</div>
              <div className="chip-group">
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`chip chip--clickable ${
                      visibilitySet.has(option) ? 'chip--active' : ''
                    }`}
                    onClick={() => onToggleVisibilityFilter?.(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-card__row">
              <div className="filter-card__label">Ownership</div>
              <div className="chip-group">
                {[
                  ['all', 'All'],
                  ['mine', 'My memories'],
                  ['others', 'Others'],
                  ['unlocked', 'Unlocked'],
                  ['following', 'Following'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip chip--clickable ${
                      filters?.ownership === value ? 'chip--active' : ''
                    }`}
                    onClick={() => onSelectOwnership?.(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-card__row">
              <div className="filter-card__label">Journey</div>
              <div className="chip-group">
                {[
                  ['all', 'Any'],
                  ['journey', 'In a journey'],
                  ['standalone', 'Standalone'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip chip--clickable ${
                      filters?.journey === value ? 'chip--active' : ''
                    }`}
                    onClick={() => onSelectJourneyType?.(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-card__row">
              <div className="filter-card__label">Media</div>
              <div className="chip-group">
                {[
                  ['all', 'Any'],
                  ['withMedia', 'Has media'],
                  ['textOnly', 'Text only'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip chip--clickable ${
                      filters?.media === value ? 'chip--active' : ''
                    }`}
                    onClick={() => onSelectMedia?.(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-card__row">
              <div className="filter-card__label">Search</div>
              <Input
                placeholder="Search memories, journeys, or handles"
                value={filters?.search || ''}
                onChange={(event) => onSearchChange?.(event.target.value)}
              />
            </div>

            <div className="filter-card__actions">
              <Button variant="ghost" onClick={onResetFilters}>
                Reset filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TopRightActions;
