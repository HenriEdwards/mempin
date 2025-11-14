const db = require('../db/queries');

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findById(id) {
  const rows = await db.query(
    'SELECT id, google_id, email, name, avatar_url, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [id],
  );
  return mapUser(rows[0]);
}

async function findByGoogleId(googleId) {
  const rows = await db.query(
    'SELECT id, google_id, email, name, avatar_url, created_at, updated_at FROM users WHERE google_id = ? LIMIT 1',
    [googleId],
  );
  return mapUser(rows[0]);
}

async function findByEmail(email) {
  const rows = await db.query(
    'SELECT id, google_id, email, name, avatar_url, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  return mapUser(rows[0]);
}

async function findByEmails(emails = []) {
  const unique = Array.from(new Set(emails.filter(Boolean)));
  if (!unique.length) {
    return [];
  }

  const placeholders = unique.map(() => '?').join(',');
  const rows = await db.query(
    `SELECT id, google_id, email, name, avatar_url, created_at, updated_at
     FROM users
     WHERE email IN (${placeholders})`,
    unique,
  );
  return rows.map(mapUser);
}

async function upsertGoogleUser({ googleId, email, name, avatarUrl }) {
  await db.query(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      email = VALUES(email),
      name = VALUES(name),
      avatar_url = VALUES(avatar_url),
      updated_at = CURRENT_TIMESTAMP`,
    [googleId, email, name, avatarUrl],
  );

  const rows = await db.query(
    'SELECT id, google_id, email, name, avatar_url, created_at, updated_at FROM users WHERE google_id = ? OR email = ? LIMIT 1',
    [googleId, email],
  );

  return mapUser(rows[0]);
}

module.exports = {
  findById,
  findByGoogleId,
  findByEmail,
  findByEmails,
  upsertGoogleUser,
};
