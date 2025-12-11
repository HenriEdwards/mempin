const asyncHandler = require('../utils/asyncHandler');
const {
  memoryAssetUpload,
  persistMemoryAssets,
  getAssetPublicUrl,
} = require('../utils/storage');
const crypto = require('crypto');
const { calculateDistanceMeters } = require('../utils/geo');
const memoryModel = require('../models/memoryModel');
const memoryAssetModel = require('../models/memoryAssetModel');
const memoryUnlockModel = require('../models/memoryUnlockModel');
const memoryTargetModel = require('../models/memoryTargetModel');
const memorySaveModel = require('../models/memorySaveModel');
const friendsModel = require('../models/friendsModel');
const journeyModel = require('../models/journeyModel');
const userModel = require('../models/userModel');
const { normalizeHandle, isValidHandle } = require('../utils/handles');
const { mapMemory } = require('../models/memoryModel');

const allowedVisibility = new Set(['public', 'private', 'unlisted', 'followers']);

function hashPasscode(passcode) {
  return crypto.createHash('sha256').update(String(passcode)).digest('hex');
}

function isMemoryExpired(memory) {
  if (!memory || !memory.expiresAt) return false;
  const expiresAt = new Date(memory.expiresAt);
  return Number.isNaN(expiresAt.getTime()) ? false : expiresAt.getTime() <= Date.now();
}

function parseNumber(value) {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseBoolFlag(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function getUploadedFilesCollection(filesInput) {
  if (!filesInput) {
    return [];
  }

  if (Array.isArray(filesInput)) {
    return filesInput;
  }

  const buckets = ['images', 'audio', 'video', 'assets'];
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

async function appendTargets(memoryId, handleList = []) {
  if (!handleList.length) return;
  const normalizedHandles = Array.from(
    new Set(
      handleList
        .map((value) => normalizeHandle(value))
        .filter((value) => isValidHandle(value)),
    ),
  );
  if (!normalizedHandles.length) return;

  const users = await userModel.findByHandles(normalizedHandles);
  const targetIds = users.filter((user) => user && user.id).map((user) => user.id);
  if (targetIds.length) {
    await memoryTargetModel.addTargets(memoryId, targetIds);
  }
}

function canAccessMemory(memory, currentUserId, followerOwnerSet, targetMap) {
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
    case 'followers':
      return currentUserId ? followerOwnerSet.has(memory.ownerId) : false;
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
    { name: 'images', maxCount: 20 },
    { name: 'audio', maxCount: 10 },
    { name: 'video', maxCount: 10 },
    { name: 'assets', maxCount: 30 },
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
    const tags = parseTagsInput(req.body.tags);
    const targetHandles = parseCommaList(req.body.targetHandles).map((handle) =>
      normalizeHandle(handle),
    );
    const newJourneyTitle = req.body.newJourneyTitle
      ? String(req.body.newJourneyTitle).trim()
      : '';
    const newJourneyDescription = req.body.newJourneyDescription
      ? String(req.body.newJourneyDescription).trim()
      : '';
    const completeJourney = parseBoolFlag(req.body.completeJourney, false);
    const expiresAt =
      req.body.expiresAt && String(req.body.expiresAt).trim()
        ? new Date(req.body.expiresAt)
        : null;
    const unlockMethod = String(req.body.unlockMethod || '').toLowerCase();
    const legacyFromMethod = (() => {
      switch (unlockMethod) {
        case 'none':
          return { location: false, followers: false, passcode: false };
        case 'followers':
          return { location: false, followers: true, passcode: false };
        case 'passcode':
          return { location: false, followers: false, passcode: true };
        case 'location':
        default:
          return { location: true, followers: false, passcode: false };
      }
    })();

    let unlockRequiresLocation = parseBoolFlag(
      req.body.unlockRequiresLocation,
      legacyFromMethod.location,
    );
    let unlockRequiresFollowers = parseBoolFlag(
      req.body.unlockRequiresFollowers,
      legacyFromMethod.followers,
    );
    let unlockRequiresPasscode = parseBoolFlag(
      req.body.unlockRequiresPasscode,
      legacyFromMethod.passcode,
    );
    const unlockPasscodeInput = req.body.unlockPasscode
      ? String(req.body.unlockPasscode).trim()
      : '';
    const unlockAvailableFrom =
      req.body.unlockAvailableFrom && String(req.body.unlockAvailableFrom).trim()
        ? new Date(req.body.unlockAvailableFrom)
        : null;
    let journeyId = parseNumber(req.body.journeyId);
    let journeyStep = parseNumber(req.body.journeyStep);

    if (unlockAvailableFrom && Number.isNaN(unlockAvailableFrom.getTime())) {
      return res.status(400).json({ error: 'Unlock available from must be a valid date/time' });
    }

    let unlockPasscodeHash = null;
    if (unlockRequiresPasscode) {
      if (!unlockPasscodeInput || unlockPasscodeInput.length < 4) {
        return res
          .status(400)
          .json({ error: 'Passcode must be at least 4 characters when passcode unlock is selected' });
      }
      unlockPasscodeHash = hashPasscode(unlockPasscodeInput);
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (latitude === null || longitude === null) {
      return res.status(400).json({ error: 'Valid coordinates are required' });
    }

    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) {
      return res
        .status(400)
        .json({ error: 'Expiry must be a valid future date/time or left blank for forever' });
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
      tags: tags.length ? tags.join(',') : null,
      visibility,
      latitude,
      longitude,
      radiusM,
      expiresAt,
      unlockRequiresLocation,
      unlockRequiresFollowers,
      unlockRequiresPasscode,
      unlockPasscodeHash,
      unlockAvailableFrom,
    });

    if (targetHandles.length) {
      await appendTargets(memory.id, targetHandles);
    }

    const uploadedFiles = getUploadedFilesCollection(req.files);
    if (uploadedFiles.length) {
      const storedFiles = await persistMemoryAssets(memory.id, uploadedFiles);
      await memoryAssetModel.addAssets(memory.id, storedFiles);
    }

    if (journeyId && completeJourney) {
      await journeyModel.updateJourneyCompletion(journeyId, req.user.id, true);
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
  const followerOwnerSet = await friendsModel.getFollowingOwnerSet(ownerIds, currentUserId);

  const filtered = memories.filter((memory) =>
    canAccessMemory(memory, currentUserId, followerOwnerSet, targetMap),
  );

  return res.json({ memories: filtered });
});

const getUnlockedMemories = asyncHandler(async (req, res) => {
  const memories = await memoryModel.getUnlockedMemories(req.user.id);
  return res.json({ memories });
});

const updateMemoryVisibility = asyncHandler(async (req, res) => {
  const memoryId = Number(req.params.id);
  const allowed = ['public', 'followers', 'unlisted', 'private'];
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
  if (isMemoryExpired(memory)) {
    return res.status(410).json({ error: 'Memory has expired' });
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
  const followerOwnerSet = await friendsModel.getFollowingOwnerSet(ownerIds, currentUserId);

  const filtered = memories.filter((memory) =>
    canAccessMemory(memory, currentUserId, followerOwnerSet, targetMap),
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

  const memory = await memoryModel.getMemoryById(memoryId, { includeSecret: true });
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

  const needsFollowerCheck =
    memory.ownerId !== req.user.id &&
    (memory.visibility === 'followers' || memory.unlockRequiresFollowers);
  if (needsFollowerCheck) {
    const isFollower = await friendsModel.isFollowing(req.user.id, memory.ownerId);
    if (!isFollower) {
      return res.status(403).json({ error: 'Only followers can unlock this memory' });
    }
  }

  if (
    memory.unlockAvailableFrom &&
    memory.ownerId !== req.user.id &&
    new Date(memory.unlockAvailableFrom).getTime() > Date.now()
  ) {
    return res
      .status(403)
      .json({ error: 'This memory is not available to unlock yet' });
  }

  const requiresLocation = memory.unlockRequiresLocation !== false;
  if (requiresLocation) {
    if (latitude === null || longitude === null) {
      return res.status(400).json({ error: 'Valid coordinates are required' });
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
  }

  if (memory.unlockRequiresPasscode) {
    const passcodeInput = req.body.passcode || req.body.unlockPasscode || '';
    if (!passcodeInput) {
      return res.status(403).json({ error: 'Passcode required to unlock' });
    }
    const hashedInput = hashPasscode(passcodeInput);
    if (!memory.unlockPasscodeHash || hashedInput !== memory.unlockPasscodeHash) {
      return res.status(403).json({ error: 'Invalid passcode' });
    }
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
    latitude: requiresLocation ? latitude : null,
    longitude: requiresLocation ? longitude : null,
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
  if (isMemoryExpired(memory) && memory.ownerId !== req.user.id) {
    return res.status(410).json({ error: 'Memory has expired' });
  }

  const isUnlockedFree =
    !memory.unlockRequiresLocation &&
    !memory.unlockRequiresFollowers &&
    !memory.unlockRequiresPasscode;
  const hasTimeLock =
    memory.unlockAvailableFrom &&
    new Date(memory.unlockAvailableFrom).getTime() > Date.now();

  let unlockedAt = memory.createdAt;
  if (memory.ownerId !== req.user.id) {
    if (hasTimeLock) {
      return res.status(403).json({ error: 'Memory not unlocked yet' });
    }
    if (!isUnlockedFree) {
      const unlockRecord = await memoryUnlockModel.getUnlockRecord(memoryId, req.user.id);
      if (!unlockRecord) {
        return res.status(403).json({ error: 'Memory not unlocked yet' });
      }
      unlockedAt = unlockRecord.unlockedAt;
    }
  }

  const memoryWithAssets = await attachAssetsToMemory(memory);
  const isSaved = await memorySaveModel.isSaved(memoryId, req.user.id);
  return res.json({
    memory: {
      ...memoryWithAssets,
      saved: isSaved,
      unlockedAt,
    },
  });
});

const saveMemory = asyncHandler(async (req, res) => {
  const memoryId = Number(req.params.id);
  if (!memoryId) {
    return res.status(400).json({ error: 'Invalid memory id' });
  }
  const memory = await memoryModel.getMemoryById(memoryId);
  if (!memory || !memory.isActive) {
    return res.status(404).json({ error: 'Memory not found' });
  }
  if (isMemoryExpired(memory)) {
    return res.status(410).json({ error: 'Memory has expired' });
  }
  const targetUserIds = await memoryTargetModel.getTargetsForMemory(memoryId);
  const followerOwnerSet = await friendsModel.getFollowingOwnerSet([memory.ownerId], req.user.id);
  if (!canAccessMemory(memory, req.user.id, followerOwnerSet, { [memory.id]: targetUserIds })) {
    return res.status(403).json({ error: 'You are not allowed to save this memory' });
  }
  await memorySaveModel.addSave(memoryId, req.user.id);
  return res.json({ saved: true });
});

const removeSavedMemory = asyncHandler(async (req, res) => {
  const memoryId = Number(req.params.id);
  if (!memoryId) {
    return res.status(400).json({ error: 'Invalid memory id' });
  }
  await memorySaveModel.removeSave(memoryId, req.user.id);
  return res.json({ saved: false });
});

const getSavedMemories = asyncHandler(async (req, res) => {
  const rows = await memorySaveModel.getSavedMemories(req.user.id);
  if (!rows.length) {
    return res.json({ memories: [] });
  }
  const mapped = rows.map((row) => mapMemory(row));
  const memoryIds = mapped.map((m) => m.id);
  const targetMap = await memoryTargetModel.getTargetsForMemories(memoryIds);
  const ownerIds = [...new Set(mapped.map((m) => m.ownerId))];
  const followerOwnerSet = await friendsModel.getFollowingOwnerSet(ownerIds, req.user.id);
  const filtered = mapped.filter(
    (memory) =>
      !isMemoryExpired(memory) &&
      canAccessMemory(memory, req.user.id, followerOwnerSet, targetMap),
  );

  const withAssets = await Promise.all(filtered.map((mem) => attachAssetsToMemory(mem)));
  const enriched = withAssets.map((mem) => ({ ...mem, saved: true }));
  return res.json({ memories: enriched });
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
  saveMemory,
  removeSavedMemory,
  getSavedMemories,
};
