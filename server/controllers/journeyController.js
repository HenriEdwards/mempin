const asyncHandler = require('../utils/asyncHandler');
const journeyModel = require('../models/journeyModel');
const memoryModel = require('../models/memoryModel');

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

const getJourneyMemories = asyncHandler(async (req, res) => {
  const journeyId = Number(req.params.id);
  if (!journeyId) {
    return res.status(400).json({ error: 'Invalid journey id' });
  }
  const journey = await journeyModel.getJourneyById(journeyId);
  if (!journey || journey.ownerId !== req.user.id) {
    return res.status(404).json({ error: 'Journey not found' });
  }
  const memories = await memoryModel.getMemoriesByJourney(journeyId, req.user.id);
  return res.json({ journey, memories });
});

const updateJourneyVisibility = asyncHandler(async (req, res) => {
  const journeyId = Number(req.params.id);
  const allowed = ['public', 'followers', 'unlisted', 'private'];
  const visibility = String(req.body.visibility || '').toLowerCase();
  if (!journeyId) {
    return res.status(400).json({ error: 'Invalid journey id' });
  }
  if (!allowed.includes(visibility)) {
    return res.status(400).json({ error: 'Invalid visibility value' });
  }
  const journey = await journeyModel.getJourneyById(journeyId);
  if (!journey || journey.ownerId !== req.user.id) {
    return res.status(404).json({ error: 'Journey not found' });
  }
  const memories = await memoryModel.updateMemoriesVisibilityForJourney({
    journeyId,
    ownerId: req.user.id,
    visibility,
  });

  return res.json({ journey, memories });
});

module.exports = {
  listJourneys,
  createJourney,
  getJourneyMemories,
  updateJourneyVisibility,
};
