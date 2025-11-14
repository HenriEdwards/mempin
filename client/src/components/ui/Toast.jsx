function Toast({ message, kind = 'info' }) {
  if (!message) return null;
  const classes = ['toast', kind === 'error' ? 'toast--error' : null]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{message}</div>;
}

export default Toast;
