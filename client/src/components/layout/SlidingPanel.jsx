function SlidingPanel({
  isOpen,
  onClose,
  title,
  children,
  width = '460px',
  hideHeader = false,
  side = 'right',
  showCloseButton = false,
}) {
  const panelStyle = { width, '--panel-width': width };
  const sideClass = side === 'left' ? 'sliding-panel--left' : 'sliding-panel--right';
  return (
    <div className={`sliding-panel ${sideClass} ${isOpen ? 'open' : ''}`}>
      <div
        className="sliding-panel__backdrop"
        role="presentation"
        onClick={onClose}
      />
      <div className="sliding-panel__content" style={panelStyle}>
        {!hideHeader && (
          <div className="sliding-panel__header">
            <h3>{title}</h3>
            {showCloseButton && (
              <button
                type="button"
                className="sliding-panel__close"
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
        )}
        <div className="sliding-panel__body">{children}</div>
      </div>
    </div>
  );
}

export default SlidingPanel;
