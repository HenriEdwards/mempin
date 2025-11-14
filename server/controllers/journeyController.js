const asyncHandler = require('../utils/asyncHandler');
const journeyModel = require('../models/journeyModel');

const listJourneys = asyncHandler(async (req, res) => {
  const journeys = await journeyModel.getJourneysByOwner(req.user.id);
  res.json({ journeys });
});

const createJourney = asyncHandler(async (req, res) => {
  const title = req.body.title ? String(req.body.title).trim() : '';
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const description = req.body.description ? String(req.body.description).trim() : null;

  const journey = await journeyModel.createJourney({
    ownerId: req.user.id,
    title,
    description,
  });

  res.status(201).json({ journey });
});

module.exports = {
  listJourneys,
  createJourney,
};
