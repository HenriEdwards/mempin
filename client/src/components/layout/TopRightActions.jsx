import { useState } from 'react';
import Button from '../ui/Button.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Input from '../ui/Input.jsx';

const VISIBILITY_OPTIONS = ['public', 'followers', 'unlisted', 'private'];

function ProfileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.65" y1="16.65" x2="21" y2="21" />
    </svg>
  );
}

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
  const { openProfilePanel, closePanel, activePanel } = useUI();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const visibilitySet = filters?.visibilities || new Set(VISIBILITY_OPTIONS);
  const isPanelOpen = Boolean(activePanel);
  const panelWidthMap = {
    profile: '480px',
    userProfile: '480px',
  };
  const defaultPanelWidth = '480px';
  const activePanelWidth = panelWidthMap[activePanel] || defaultPanelWidth;
  const actionOffset = isPanelOpen ? `calc(${activePanelWidth} + 1.5rem)` : '1.5rem';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleProfileClick = () => {
    if (activePanel === 'profile') {
      closePanel();
      return;
    }
    openProfilePanel();
  };

  return (
    <div className={`map-actions ${isPanelOpen ? 'map-actions--panel-open' : ''}`} style={{ right: actionOffset }}>


      <div className="filter-wrapper">
        <Button variant="ghost" onClick={onToggleFilter} aria-label="Filters">
          <SearchIcon />
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
      <Button variant="ghost" onClick={handleProfileClick} aria-label="Profile">
        <ProfileIcon />
      </Button>
            <Button
        variant="ghost"
        onClick={handleLogout}
        aria-label="Logout"
        title="Logout"
        disabled={loggingOut}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </Button>
    </div>
  );
}

export default TopRightActions;
