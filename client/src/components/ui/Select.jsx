function Select({ label, tooltip, children, className = '', ...props }) {
  return (
    <div className="field">
      {label && (
        <label className="field-label" title={tooltip}>
          {label}
        </label>
      )}
      <select className={`select ${className}`} {...props}>
        {children}
      </select>
    </div>
  );
}

export default Select;
