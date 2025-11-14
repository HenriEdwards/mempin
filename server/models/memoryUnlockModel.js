const db = require('../db/queries');

function mapUnlock(row = {}) {
  return {
    id: row.id,
    memoryId: row.memory_id,
    userId: row.user_id,
    unlockedAt: row.unlocked_at,
    latitude: row.unlock_latitude
      ? Number(row.unlock_latitude)
      : undefined,
    longitude: row.unlock_longitude
      ? Number(row.unlock_longitude)
      : undefined,
  };
}

async function getUnlockRecord(memoryId, userId) {
  const rows = await db.query(
    `SELECT id, memory_id, user_id, unlocked_at, unlock_latitude, unlock_longitude
     FROM memory_unlocks
     WHERE memory_id = ? AND user_id = ?
     LIMIT 1`,
    [memoryId, userId],
  );
  return mapUnlock(rows[0]);
}

async function upsertUnlock({
  memoryId,
  userId,
  latitude,
  longitude,
}) {
  await db.query(
    `INSERT INTO memory_unlocks (memory_id, user_id, unlock_latitude, unlock_longitude)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       unlock_latitude = VALUES(unlock_latitude),
       unlock_longitude = VALUES(unlock_longitude)`,
    [memoryId, userId, latitude, longitude],
  );

  return getUnlockRecord(memoryId, userId);
}

module.exports = {
  getUnlockRecord,
  upsertUnlock,
};
