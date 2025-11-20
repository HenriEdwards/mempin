const asyncHandler = require('../utils/asyncHandler');
const {
  memoryAssetUpload,
  persistMemoryAssets,
  getAssetPublicUrl,
} = require('../utils/storage');
const { calculateDistanceMeters } = require('../utils/geo');
const memoryModel = require('../models/memoryModel');
const memoryAssetModel = require('../models/memoryAssetModel');
const memoryUnlockModel = require('../models/memoryUnlockModel');
const memoryTargetModel = require('../models/memoryTargetModel');
const friendsModel = require('../models/friendsModel');
const journeyModel = require('../models/journeyModel');
const userModel = require('../models/userModel');

const allowedVisibility = new Set(['public', 'private', 'unlisted', 'friends']);

function parseNumber(value) {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getUploadedFilesCollection(filesInput) {
  if (!filesInput) {
    return [];
  }

  if (Array.isArray(filesInput)) {
    return filesInput;
  }

  const buckets = ['images', 'audio', 'assets'];
  return buckets.flatMap((key) => filesInput[key] || []);
}

function clampRadius(radius) {
  if (!radius) return 50;
  return Math.min(200, Math.max(20, Math.round(radius)));
}

function parseCommaList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (error) {
    // ignore JSON error
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTagsInput(value) {
  return parseCommaList(value)
    .map((tag) => tag.replace(/[,]/g, '').toLowerCase())
    .slice(0, 10);
}

async function appendTargets(memoryId, emailList = []) {
  if (!emailList.length) return;
  const users = await userModel.findByEmails(emailList);
  const targetIds = users
    .filter((user) => user && user.id)
    .map((user) => user.id);
  if (targetIds.length) {
    await memoryTargetModel.addTargets(memoryId, targetIds);
  }
}

function canAccessMemory(memory, currentUserId, friendOwnerSet, targetMap) {
  const targetUserIds = targetMap[memory.id] || [];
  if (currentUserId && memory.ownerId === currentUserId) {
    return true;
  }
  if (targetUserIds.length) {
    return currentUserId ? targetUserIds.includes(currentUserId) : false;
  }

  switch (memory.visibility) {
    case 'public':
      return true;
    case 'friends':
      return currentUserId ? friendOwnerSet.has(memory.ownerId) : false;
    case 'unlisted':
      return false;
    case 'private':
    default:
      return false;
  }
}
async function attachAssetsToMemory(memory) {
  if (!memory) return null;
  const assets = await memoryAssetModel.getAssetsByMemoryId(memory.id);
  const formattedAssets = assets.map((asset) => ({
    id: asset.id,
    type: asset.type,
    mimeType: asset.mimeType,
    url: getAssetPublicUrl(asset.storageKey),
  }));

  return {
    ...memory,
    assets: formattedAssets,
  };
}

const createMemory = [
  memoryAssetUpload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'audio', maxCount: 2 },
    { name: 'assets', maxCount: 8 },
  ]),
  asyncHandler(async (req, res) => {
    const latitude = parseNumber(req.body.latitude);
    const longitude = parseNumber(req.body.longitude);
    const radiusM = clampRadius(parseNumber(req.body.radiusM) || 50);
    const visibility = allowedVisibility.has(req.body.visibility)
      ? req.body.visibility
      : 'public';
    const title = req.body.title ? String(req.body.title).trim() : '';
    const shortDescription = req.body.shortDescription
      ? String(req.body.shortDescription).trim().slice(0, 100)
      : null;
    const body = req.body.body ? String(req.body.body).trim() : null;
    const tags = parseTagsInput(req.body.tags);
    const targetEmails = parseCommaList(req.body.targetEmails).map((email) =>
      email.toLowerCase(),
    );
    const newJourneyTitle = req.body.newJourneyTitle
      ? String(req.body.newJourneyTitle).trim()
      : '';
    const newJourneyDescription = req.body.newJourneyDescription
      ? String(req.body.newJourneyDescription).trim()
      : '';
    let journeyId = parseNumber(req.body.journeyId);
    let journeyStep = parseNumber(req.body.journeyStep);

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (latitude === null || longitude === null) {
      return res.status(400).json({ error: 'Valid coordinates are required' });
    }

    if (newJourneyTitle) {
      const newJourney = await journeyModel.createJourney({
        ownerId: req.user.id,
        title: newJourneyTitle,
        description: newJourneyDescription || null,
      });
      journeyId = newJourney.id;
    }

    if (journeyId) {
      journeyStep = journeyStep ? Math.max(1, Math.round(journeyStep)) : 1;
    } else {
      journeyStep = null;
    }

    const memory = await memoryModel.createMemory({
      ownerId: req.user.id,
      journeyId,
      journeyStep,
      title,
      shortDescription,
      body,
      tags: tags.length ? tags.join(',') : null,
      visibility,
      latitude,
      longitude,
      radiusM,
    });

    if (targetEmails.length) {
      await appendTargets(memory.id, targetEmails);
    }

    const uploadedFiles = getUploadedFilesCollection(req.files);
    if (uploadedFiles.length) {
      const storedFiles = await persistMemoryAssets(memory.id, uploadedFiles);
      await memoryAssetModel.addAssets(memory.id, storedFiles);
    }

    const withAssets = await attachAssetsToMemory(memory);
    return res.status(201).json({ memory: withAssets });
  }),
];

const getPlacedMemories = asyncHandler(async (req, res) => {
  const memories = await memoryModel.getPlacedMemories(req.user.id);
  return res.json({ memories });
});

const getAllMemories = asyncHandler(async (req, res) => {
  const memories = await memoryModel.getAllActiveMemories();
  const memoryIds = memories.map((memory) => memory.id);
  const targetMap = await memoryTargetModel.getTargetsForMemories(memoryIds);
  const ownerIds = [...new Set(memories.map((memory) => memory.ownerId))];
  const currentUserId = req.user ? req.user.id : null;
  const friendOwnerSet = await friendsModel.getFriendOwnerSet(ownerIds, currentUserId);

  const filtered = memories.filter((memory) =>
    canAccessMemory(memory, currentUserId, friendOwnerSet, targetMap),
  );

  return res.json({ memories: filtered });
});

const getUnlockedMemories = asyncHandler(async (req, res) => {
  const memories = await memoryModel.getUnlockedMemories(req.user.id);
  return res.json({ memories });
});

const updateMemoryVisibility = asyncHandler(async (req, res) => {
  const memoryId = Number(req.params.id);
  const allowed = ['public', 'friends', 'unlisted', 'private'];
  const visibility = String(req.body.visibility || '').toLowerCase();
  if (!memoryId) {
    return res.status(400).json({ error: 'Invalid memory id' });
  }
  if (!allowed.includes(visibility)) {
    return res.status(400).json({ error: 'Invalid visibility value' });
  }
  const memory = await memoryModel.getMemoryById(memoryId);
  if (!memory || !memory.isActive) {
    return res.status(404).json({ error: 'Memory not found' });
  }
  if (memory.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed to update this memory' });
  }

  const updated = await memoryModel.updateMemoryVisibility(memoryId, visibility);
  return res.json({ memory: updated });
});

const getNearbyMemories = asyncHandler(async (req, res) => {
  const latitude = parseNumber(req.query.lat ?? req.query.latitude);
  const longitude = parseNumber(req.query.lng ?? req.query.longitude);
  const radius = parseNumber(req.query.radius) || 500;

  if (latitude === null || longitude === null) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  const memories = await memoryModel.getNearbyMemories({
    latitude,
    longitude,
    radiusMeters: radius,
  });

  const memoryIds = memories.map((memory) => memory.id);
  const targetMap = await memoryTargetModel.getTargetsForMemories(memoryIds);
  const ownerIds = [...new Set(memories.map((memory) => memory.ownerId))];
  const currentUserId = req.user ? req.user.id : null;
  const friendOwnerSet = await friendsModel.getFriendOwnerSet(ownerIds, currentUserId);

  const filtered = memories.filter((memory) =>
    canAccessMemory(memory, currentUserId, friendOwnerSet, targetMap),
  );

  return res.json({ memories: filtered });
});

const unlockMemory = asyncHandler(async (req, res) => {
  const memoryId = Number(req.params.id);
  if (!memoryId) {
    return res.status(400).json({ error: 'Invalid memory id' });
  }

  const latitude = parseNumber(req.body.latitude);
  const longitude = parseNumber(req.body.longitude);
  if (latitude === null || longitude === null) {
    return res.status(400).json({ error: 'Valid coordinates are required' });
  }

  const memory = await memoryModel.getMemoryById(memoryId);
  if (!memory || !memory.isActive) {
    return res.status(404).json({ error: 'Memory not found' });
  }

  const targetUserIds = await memoryTargetModel.getTargetsForMemory(memoryId);
  if (
    targetUserIds.length &&
    memory.ownerId !== req.user.id &&
    !targetUserIds.includes(req.user.id)
  ) {
    return res.status(403).json({ error: 'You are not allowed to unlock this memory' });
  }

  if (memory.visibility === 'private' && memory.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'This memory is private' });
  }

  if (memory.visibility === 'friends' && memory.ownerId !== req.user.id) {
    const isFriend = await friendsModel.isFriend(memory.ownerId, req.user.id);
    if (!isFriend) {
      return res.status(403).json({ error: 'Only friends can unlock this memory' });
    }
  }

  const distance = calculateDistanceMeters(
    latitude,
    longitude,
    memory.latitude,
    memory.longitude,
  );

  if (distance > memory.radiusM) {
    return res.status(403).json({ error: 'Too far to unlock' });
  }

  if (memory.journeyId && memory.journeyStep > 1) {
    const previousStep = await memoryModel.getMemoryByJourneyStep(
      memory.journeyId,
      memory.journeyStep - 1,
    );
    if (previousStep) {
      const unlockedPrevious = await memoryUnlockModel.getUnlockRecord(
        previousStep.id,
        req.user.id,
      );
      if (!unlockedPrevious) {
        return res
          .status(403)
          .json({ error: 'Previous step not unlocked yet' });
      }
    }
  }

  const unlockRecord = await memoryUnlockModel.upsertUnlock({
    memoryId,
    userId: req.user.id,
    latitude,
    longitude,
  });

  const updatedMemory = await memoryModel.getMemoryById(memoryId);
  const memoryWithAssets = await attachAssetsToMemory(updatedMemory);

  return res.json({
    memory: {
      ...memoryWithAssets,
      unlockedAt: unlockRecord.unlockedAt,
    },
  });
});

const getMemoryDetails = asyncHandler(async (req, res) => {
  const memoryId = Number(req.params.id);
  if (!memoryId) {
    return res.status(400).json({ error: 'Invalid memory id' });
  }

  const memory = await memoryModel.getMemoryById(memoryId);
  if (!memory || !memory.isActive) {
    return res.status(404).json({ error: 'Memory not found' });
  }

  let unlockedAt = memory.createdAt;
  if (memory.ownerId !== req.user.id) {
    const unlockRecord = await memoryUnlockModel.getUnlockRecord(memoryId, req.user.id);
    if (!unlockRecord) {
      return res.status(403).json({ error: 'Memory not unlocked yet' });
    }
    unlockedAt = unlockRecord.unlockedAt;
  }

  const memoryWithAssets = await attachAssetsToMemory(memory);
  return res.json({
    memory: {
      ...memoryWithAssets,
      unlockedAt,
    },
  });
});

module.exports = {
  createMemory,
  getPlacedMemories,
  getAllMemories,
  getUnlockedMemories,
  getNearbyMemories,
  unlockMemory,
  getMemoryDetails,
  updateMemoryVisibility,
};
