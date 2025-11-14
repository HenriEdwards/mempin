const db = require('../db/queries');

async function addTargets(memoryId, userIds = []) {
  if (!userIds.length) {
    return;
  }
  const values = userIds
    .filter((id, index, arr) => arr.indexOf(id) === index)
    .map((id) => [memoryId, id]);

  const placeholders = values.map(() => '(?, ?)').join(', ');
  const flat = values.flat();

  await db.query(
    `INSERT INTO memory_targets (memory_id, target_user_id)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE memory_id = memory_id`,
    flat,
  );
}

async function getTargetsForMemory(memoryId) {
  const rows = await db.query(
    `SELECT target_user_id
     FROM memory_targets
     WHERE memory_id = ?`,
    [memoryId],
  );
  return rows.map((row) => row.target_user_id);
}

async function getTargetsForMemories(memoryIds = []) {
  if (!memoryIds.length) {
    return {};
  }

  const placeholders = memoryIds.map(() => '?').join(',');
  const rows = await db.query(
    `SELECT memory_id, target_user_id
     FROM memory_targets
     WHERE memory_id IN (${placeholders})`,
    memoryIds,
  );

  return rows.reduce((acc, row) => {
    if (!acc[row.memory_id]) {
      acc[row.memory_id] = [];
    }
    acc[row.memory_id].push(row.target_user_id);
    return acc;
  }, {});
}

module.exports = {
  addTargets,
  getTargetsForMemory,
  getTargetsForMemories,
};
