function Tooltip({ label, children }) {
  if (!label) return children;

  return (
    <span className="tooltip-anchor" data-tooltip={label}>
      {children}
    </span>
  );
}

export default Tooltip;
