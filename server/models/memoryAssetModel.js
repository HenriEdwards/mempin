const db = require('../db/queries');

function mapAsset(row = {}) {
  return {
    id: row.id,
    memoryId: row.memory_id,
    type: row.type,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

async function getAssetsByMemoryId(memoryId) {
  const rows = await db.query(
    `SELECT id, memory_id, type, storage_key, mime_type, sort_order, created_at
     FROM memory_assets
     WHERE memory_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [memoryId],
  );

  return rows.map(mapAsset);
}

async function addAssets(memoryId, assets = []) {
  if (!assets.length) {
    return [];
  }

  const values = [];
  const placeholders = assets
    .map((asset, index) => {
      values.push(
        memoryId,
        asset.type,
        asset.storageKey,
        asset.mimeType,
        asset.sortOrder ?? index,
      );
      return '(?, ?, ?, ?, ?)';
    })
    .join(', ');

  await db.query(
    `INSERT INTO memory_assets
      (memory_id, type, storage_key, mime_type, sort_order)
      VALUES ${placeholders}`,
    values,
  );

  return getAssetsByMemoryId(memoryId);
}

module.exports = {
  addAssets,
  getAssetsByMemoryId,
};
