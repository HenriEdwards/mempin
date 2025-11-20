const db = require('../db/queries');
const { calculateDistanceMeters, getBoundingBox } = require('../utils/geo');

function mapMemory(row = {}) {
  const tags = row.tags
    ? row.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
  return {
    id: row.id,
    ownerId: row.owner_id,
    journeyId: row.journey_id,
    journeyStep: row.journey_step,
    journeyStepCount: row.journey_step_count ? Number(row.journey_step_count) : null,
    title: row.title,
    shortDescription: row.short_description,
    body: row.body,
    tags,
    visibility: row.visibility,
    latitude: typeof row.latitude === 'number' ? row.latitude : Number(row.latitude),
    longitude: typeof row.longitude === 'number' ? row.longitude : Number(row.longitude),
    radiusM: row.radius_m,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timesFound: row.times_found || 0,
    hasMedia: row.has_media ? row.has_media > 0 : false,
    lastUnlockedAt: row.last_unlocked_at || null,
  };
}

async function createMemory({
  ownerId,
  journeyId,
  journeyStep,
  title,
  shortDescription,
  body,
  tags,
  visibility,
  latitude,
  longitude,
  radiusM,
}) {
  const result = await db.query(
    `INSERT INTO memories
    (owner_id, journey_id, journey_step, title, short_description, body, tags, visibility, latitude, longitude, radius_m)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ownerId,
      journeyId || null,
      journeyStep || null,
      title,
      shortDescription || null,
      body,
      tags || null,
      visibility,
      latitude,
      longitude,
      radiusM,
    ],
  );

  return getMemoryById(result.insertId);
}

async function getMemoryById(id) {
  const rows = await db.query(
    `SELECT
      m.*,
      COALESCE(mu.count_unlocks, 0) AS times_found,
      COALESCE(mu.last_unlocked_at, NULL) AS last_unlocked_at,
      COALESCE(ma.asset_count, 0) AS has_media,
      COALESCE(js.step_count, NULL) AS journey_step_count
    FROM memories m
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
      SELECT journey_id, COUNT(*) AS step_count
      FROM memories
      WHERE journey_id IS NOT NULL
      GROUP BY journey_id
    ) js ON js.journey_id = m.journey_id
    WHERE m.id = ?
    LIMIT 1`,
    [id],
  );

  return mapMemory(rows[0]);
}

async function getPlacedMemories(ownerId) {
  const rows = await db.query(
    `SELECT
      m.*,
      COALESCE(mu.count_unlocks, 0) AS times_found,
      COALESCE(mu.last_unlocked_at, NULL) AS last_unlocked_at,
      COALESCE(ma.asset_count, 0) AS has_media,
      COALESCE(js.step_count, NULL) AS journey_step_count
     FROM memories m
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
       SELECT journey_id, COUNT(*) AS step_count
       FROM memories
       WHERE journey_id IS NOT NULL
       GROUP BY journey_id
     ) js ON js.journey_id = m.journey_id
     WHERE m.owner_id = ?
     ORDER BY m.created_at DESC`,
    [ownerId],
  );

  return rows.map(mapMemory);
}

async function getUnlockedMemories(userId) {
  const rows = await db.query(
    `SELECT
      m.*,
      mu.unlocked_at,
      COALESCE(ma.asset_count, 0) AS has_media,
      COALESCE(mu2.last_unlocked_at, NULL) AS last_unlocked_at,
      COALESCE(js.step_count, NULL) AS journey_step_count
     FROM memory_unlocks mu
     INNER JOIN memories m ON m.id = mu.memory_id
     LEFT JOIN (
       SELECT memory_id, COUNT(*) AS asset_count
       FROM memory_assets
       GROUP BY memory_id
     ) ma ON ma.memory_id = m.id
     LEFT JOIN (
       SELECT memory_id, COUNT(*) AS count_unlocks, MAX(unlocked_at) AS last_unlocked_at
       FROM memory_unlocks
       GROUP BY memory_id
     ) mu2 ON mu2.memory_id = m.id
     LEFT JOIN (
       SELECT journey_id, COUNT(*) AS step_count
       FROM memories
       WHERE journey_id IS NOT NULL
       GROUP BY journey_id
     ) js ON js.journey_id = m.journey_id
     WHERE mu.user_id = ?
     ORDER BY mu.unlocked_at DESC`,
    [userId],
  );

  return rows.map((row) => ({
    ...mapMemory(row),
    unlockedAt: row.unlocked_at,
  }));
}

async function getNearbyMemories({ latitude, longitude, radiusMeters }) {
  const bounds = getBoundingBox(latitude, longitude, radiusMeters);
  const rows = await db.query(
    `SELECT
      m.*,
      COALESCE(mu.count_unlocks, 0) AS times_found,
      COALESCE(mu.last_unlocked_at, NULL) AS last_unlocked_at,
      COALESCE(ma.asset_count, 0) AS has_media,
      COALESCE(js.step_count, NULL) AS journey_step_count
     FROM memories m
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
       SELECT journey_id, COUNT(*) AS step_count
       FROM memories
       WHERE journey_id IS NOT NULL
       GROUP BY journey_id
     ) js ON js.journey_id = m.journey_id
     WHERE m.is_active = 1
       AND m.latitude BETWEEN ? AND ?
       AND m.longitude BETWEEN ? AND ?`,
    [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng],
  );

  return rows
    .map(mapMemory)
    .filter(
      (memory) =>
        calculateDistanceMeters(
          latitude,
          longitude,
          memory.latitude,
          memory.longitude,
        ) <= radiusMeters,
    );
}

async function getAllActiveMemories() {
  const rows = await db.query(
    `SELECT
      m.*,
      COALESCE(mu.count_unlocks, 0) AS times_found,
      COALESCE(mu.last_unlocked_at, NULL) AS last_unlocked_at,
      COALESCE(ma.asset_count, 0) AS has_media,
      COALESCE(js.step_count, NULL) AS journey_step_count
     FROM memories m
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
       SELECT journey_id, COUNT(*) AS step_count
       FROM memories
       WHERE journey_id IS NOT NULL
       GROUP BY journey_id
     ) js ON js.journey_id = m.journey_id
     WHERE m.is_active = 1`,
  );

  return rows.map(mapMemory);
}

async function getMemoryByJourneyStep(journeyId, journeyStep) {
  if (!journeyId || !journeyStep) {
    return null;
  }

  const rows = await db.query(
    `SELECT id, owner_id
     FROM memories
     WHERE journey_id = ? AND journey_step = ?
     LIMIT 1`,
    [journeyId, journeyStep],
  );
  return rows[0] || null;
}

async function getMemoriesByJourney(journeyId, ownerId) {
  const rows = await db.query(
    `SELECT
      m.*,
      COALESCE(mu.count_unlocks, 0) AS times_found,
      COALESCE(mu.last_unlocked_at, NULL) AS last_unlocked_at,
      COALESCE(ma.asset_count, 0) AS has_media,
      COALESCE(js.step_count, NULL) AS journey_step_count
     FROM memories m
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
       SELECT journey_id, COUNT(*) AS step_count
       FROM memories
       WHERE journey_id IS NOT NULL
       GROUP BY journey_id
     ) js ON js.journey_id = m.journey_id
     WHERE m.journey_id = ?
       AND m.owner_id = ?
     ORDER BY m.journey_step ASC`,
    [journeyId, ownerId],
  );

  return rows.map(mapMemory);
}

async function updateMemoriesVisibilityForJourney({ journeyId, ownerId, visibility }) {
  await db.query(
    `UPDATE memories
     SET visibility = ?
     WHERE journey_id = ?
       AND owner_id = ?`,
    [visibility, journeyId, ownerId],
  );
  return getMemoriesByJourney(journeyId, ownerId);
}

async function updateMemoryVisibility(id, visibility) {
  await db.query(
    `UPDATE memories
     SET visibility = ?
     WHERE id = ?
     LIMIT 1`,
    [visibility, id],
  );
  return getMemoryById(id);
}

module.exports = {
  createMemory,
  getMemoryById,
  getPlacedMemories,
  getUnlockedMemories,
  getAllActiveMemories,
  getNearbyMemories,
  getMemoryByJourneyStep,
  updateMemoryVisibility,
  getMemoriesByJourney,
  updateMemoriesVisibilityForJourney,
};
