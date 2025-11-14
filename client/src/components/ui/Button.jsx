function Button({ variant = 'primary', className = '', children, ...props }) {
  const classes = ['btn', `btn-${variant}`, className].filter(Boolean).join(' ');
  return (
    <button className={classes} type="button" {...props}>
      {children}
    </button>
  );
}

export default Button;
