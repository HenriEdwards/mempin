function normalizeHandle(input = '') {
  return String(input || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

function isValidHandle(handle) {
  return Boolean(handle) && /^[a-z0-9_]{3,20}$/.test(handle);
}

module.exports = {
  normalizeHandle,
  isValidHandle,
};
