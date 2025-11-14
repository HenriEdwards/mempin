function Input({ label, tooltip, className = '', ...props }) {
  return (
    <div className="field">
      {label && (
        <label className="field-label" title={tooltip}>
          {label}
        </label>
      )}
      <input className={`input ${className}`} {...props} />
    </div>
  );
}

export default Input;
