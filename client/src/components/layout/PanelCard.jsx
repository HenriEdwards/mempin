function PanelCard({ title, onClose, actions = null, children }) {
  const showHeader = Boolean(title || onClose || actions);

  return (
    <div className="panel-card panel-card--docked">
      {showHeader && (
        <div className="panel-card__header">
          <h3 className="panel-card__title">{title || 'Panel'}</h3>
          <div className="panel-card__header-actions">
            {actions}
            {onClose && (
              <button
                type="button"
                className="panel-card__close"
                aria-label="Close panel"
                onClick={onClose}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      <div className="panel-card__body">{children}</div>
    </div>
  );
}

export default PanelCard;
