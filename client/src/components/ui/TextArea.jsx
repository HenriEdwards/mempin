function TextArea({ label, tooltip, className = '', ...props }) {
  return (
    <div className="field">
      {label && (
        <label className="field-label" title={tooltip}>
          {label}
        </label>
      )}
      <textarea className={`textarea ${className}`} {...props} />
    </div>
  );
}

export default TextArea;
