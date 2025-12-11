const db = require('../db/queries');

function mapJourney(row = {}) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    stepCount: row.step_count ? Number(row.step_count) : 0,
    completed: row.completed === 1 || row.completed === true,
  };
}

async function createJourney({ ownerId, title, description }) {
  const result = await db.query(
    `INSERT INTO journeys (owner_id, title, description, completed)
     VALUES (?, ?, ?, 0)`,
    [ownerId, title, description || null],
  );

  const rows = await db.query(
    `SELECT j.*, COALESCE(ms.step_count, 0) AS step_count
     FROM journeys j
     LEFT JOIN (
      SELECT journey_id, COUNT(*) AS step_count
      FROM memories
      WHERE journey_id IS NOT NULL
      GROUP BY journey_id
     ) ms ON ms.journey_id = j.id
     WHERE j.id = ?`,
    [result.insertId],
  );

  return mapJourney(rows[0]);
}

async function getJourneysByOwner(ownerId) {
  const rows = await db.query(
    `SELECT j.*, COALESCE(ms.step_count, 0) AS step_count
     FROM journeys j
     LEFT JOIN (
      SELECT journey_id, COUNT(*) AS step_count
      FROM memories
      WHERE journey_id IS NOT NULL
      GROUP BY journey_id
     ) ms ON ms.journey_id = j.id
     WHERE j.owner_id = ?
     ORDER BY j.created_at DESC`,
    [ownerId],
  );

  return rows.map(mapJourney);
}

async function getJourneyById(id) {
  const rows = await db.query(
    `SELECT j.*, COALESCE(ms.step_count, 0) AS step_count
     FROM journeys j
     LEFT JOIN (
      SELECT journey_id, COUNT(*) AS step_count
      FROM memories
      WHERE journey_id IS NOT NULL
      GROUP BY journey_id
     ) ms ON ms.journey_id = j.id
     WHERE j.id = ?
     LIMIT 1`,
    [id],
  );

  return rows.length ? mapJourney(rows[0]) : null;
}

async function getJourneySteps(journeyId) {
  const rows = await db.query(
    `SELECT id, title, journey_step
     FROM memories
     WHERE journey_id = ?
     ORDER BY journey_step ASC`,
    [journeyId],
  );
  return rows;
}

async function updateJourneyCompletion(journeyId, ownerId, completed = true) {
  await db.query(
    `UPDATE journeys
     SET completed = ?
     WHERE id = ? AND owner_id = ?`,
    [completed ? 1 : 0, journeyId, ownerId],
  );
  return getJourneyById(journeyId);
}

module.exports = {
  createJourney,
  getJourneysByOwner,
  getJourneyById,
  getJourneySteps,
  updateJourneyCompletion,
};
