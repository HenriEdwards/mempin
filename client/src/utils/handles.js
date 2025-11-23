export function normalizeHandle(value = '') {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

export function getHandleError(value) {
  const normalized = normalizeHandle(value);
  if (!normalized) {
    return 'Handle is required';
  }
  if (normalized.length < 3 || normalized.length > 20) {
    return 'Handle must be 3-20 characters';
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return 'Use letters, numbers, or underscores only';
  }
  return '';
}
