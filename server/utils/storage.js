const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const tempDir = path.join(uploadsRoot, 'temp');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDir(tempDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const randomSeed =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${randomSeed}${ext}`);
  },
});

const memoryAssetUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // allow short videos
    files: 8,
  },
});

function getUploadsRoot() {
  return uploadsRoot;
}

async function persistMemoryAssets(memoryId, files = []) {
  if (!files.length) {
    return [];
  }

  const memoryDir = path.join(uploadsRoot, `memory-${memoryId}`);
  ensureDir(memoryDir);

  const moves = files.map(async (file) => {
    const finalPath = path.join(memoryDir, file.filename);
    await fs.promises.rename(file.path, finalPath);

    const storageKey = path
      .relative(uploadsRoot, finalPath)
      .replace(/\\/g, '/');

    let type = 'image';
    if (file.mimetype?.startsWith('audio/')) {
      type = 'audio';
    } else if (file.mimetype?.startsWith('video/')) {
      type = 'video';
    }

    return {
      storageKey,
      mimeType: file.mimetype,
      type,
    };
  });

  return Promise.all(moves);
}

function getAssetPublicUrl(storageKey) {
  if (!storageKey) {
    return null;
  }
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
  const normalized = storageKey.replace(/\\/g, '/');
  return `${baseUrl.replace(/\/$/, '')}/uploads/${normalized}`;
}

module.exports = {
  memoryAssetUpload,
  persistMemoryAssets,
  getAssetPublicUrl,
  getUploadsRoot,
};
