const db = require('../db/queries');

async function addSave(memoryId, userId) {
  await db.query(
    `INSERT INTO memory_saves (memory_id, user_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE memory_id = VALUES(memory_id)`,
    [memoryId, userId],
  );
}

async function removeSave(memoryId, userId) {
  await db.query(`DELETE FROM memory_saves WHERE memory_id = ? AND user_id = ?`, [
    memoryId,
    userId,
  ]);
}

async function getSavedMemoryIds(userId) {
  const rows = await db.query(
    `SELECT memory_id
     FROM memory_saves
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map((row) => row.memory_id);
}

async function getSavedMemories(userId) {
  const rows = await db.query(
    `SELECT
      m.*,
      u.name AS owner_name,
      u.handle AS owner_handle,
      u.avatar_url AS owner_avatar_url,
      COALESCE(mu.count_unlocks, 0) AS times_found,
      COALESCE(mu.last_unlocked_at, NULL) AS last_unlocked_at,
      COALESCE(ma.asset_count, 0) AS has_media,
      COALESCE(mac.image_count, 0) AS image_count,
      COALESCE(mac.audio_count, 0) AS audio_count,
      COALESCE(mac.video_count, 0) AS video_count,
      COALESCE(js.step_count, NULL) AS journey_step_count,
      ms.created_at AS saved_at
     FROM memory_saves ms
     INNER JOIN memories m ON m.id = ms.memory_id
     INNER JOIN users u ON u.id = m.owner_id
     LEFT JOIN (
       SELECT memory_id, COUNT(*) AS count_unlocks, MAX(unlocked_at) AS last_unlocked_at
       FROM memory_unlocks
       GROUP BY memory_id
     ) mu ON mu.memory_id = m.id
     LEFT JOIN (
       SELECT memory_id, COUNT(*) AS asset_count
       FROM memory_assets
       GROUP BY memory_id
     ) ma ON ma.memory_id = m.id
     LEFT JOIN (
       SELECT
         memory_id,
         SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END) AS image_count,
         SUM(CASE WHEN type = 'audio' THEN 1 ELSE 0 END) AS audio_count,
         SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) AS video_count
       FROM memory_assets
       GROUP BY memory_id
     ) mac ON mac.memory_id = m.id
     LEFT JOIN (
       SELECT journey_id, COUNT(*) AS step_count
       FROM memories
       WHERE journey_id IS NOT NULL
       GROUP BY journey_id
     ) js ON js.journey_id = m.journey_id
     WHERE ms.user_id = ?
       AND m.is_active = 1
       AND (m.expires_at IS NULL OR m.expires_at > NOW())
     ORDER BY ms.created_at DESC`,
    [userId],
  );

  return rows;
}

async function isSaved(memoryId, userId) {
  const rows = await db.query(
    `SELECT 1 FROM memory_saves WHERE memory_id = ? AND user_id = ? LIMIT 1`,
    [memoryId, userId],
  );
  return rows.length > 0;
}

module.exports = {
  addSave,
  removeSave,
  getSavedMemoryIds,
  getSavedMemories,
  isSaved,
};
