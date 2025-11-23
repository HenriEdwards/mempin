function SlidingPanel({ isOpen, onClose, title, children, width = '460px' }) {
  const panelStyle = { width, '--panel-width': width };
  return (
    <div className={`sliding-panel ${isOpen ? 'open' : ''}`}>
      <div
        className="sliding-panel__backdrop"
        role="presentation"
        onClick={onClose}
      />
      <div className="sliding-panel__content" style={panelStyle}>
        <div className="sliding-panel__header">
          <h3>{title}</h3>
        </div>
        <div className="sliding-panel__body">{children}</div>
      </div>
    </div>
  );
}

export default SlidingPanel;
