SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS memory_targets;
DROP TABLE IF EXISTS journeys;
DROP TABLE IF EXISTS user_followers;
DROP TABLE IF EXISTS memory_unlocks;
DROP TABLE IF EXISTS memory_assets;
DROP TABLE IF EXISTS memories;
DROP TABLE IF EXISTS memory_saves;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- USERS: Registered users via Google OAuth
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  google_id VARCHAR(64) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) DEFAULT NULL,
  handle VARCHAR(20) DEFAULT NULL,       -- unique @handle (lowercase)

  -- AVATAR FIELDS (future-proof)
  avatar_url VARCHAR(512) DEFAULT NULL,           -- public URL used in UI
  avatar_storage_key VARCHAR(512) DEFAULT NULL,   -- internal storage path (S3/MinIO)
  avatar_updated_at DATETIME DEFAULT NULL,        -- cache-bust
  has_custom_avatar TINYINT(1) NOT NULL DEFAULT 0,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google_id (google_id),
  UNIQUE KEY uq_users_handle (handle)    -- ensures @handle is unique
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- JOURNEYS: Optional sequences of memories
CREATE TABLE journeys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,   -- 0 = not completed, 1 = completed
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_journeys_owner (owner_id),
  CONSTRAINT fk_journeys_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MEMORIES: Each memory is anchored to a specific location
CREATE TABLE memories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  journey_id BIGINT UNSIGNED NULL,
  journey_step INT NULL,

  title VARCHAR(255) NOT NULL,
  short_description VARCHAR(255) DEFAULT NULL,
  tags VARCHAR(255) DEFAULT NULL, -- comma-separated tags, eg: "love,travel"
  visibility ENUM('public','private','followers','unlisted') NOT NULL DEFAULT 'public',

  -- CORE LOCATION (keep using this for map rendering)
  latitude  DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  radius_m INT NOT NULL DEFAULT 50,  -- distance (in meters) required for location checks

  -- UNLOCK RULES
  unlock_requires_location TINYINT(1) NOT NULL DEFAULT 1,  -- location radius gate
  unlock_requires_followers TINYINT(1) NOT NULL DEFAULT 0, -- must follow owner
  unlock_requires_passcode TINYINT(1) NOT NULL DEFAULT 0,  -- passcode gate
  unlock_passcode_hash VARCHAR(255) DEFAULT NULL,          -- store hashed passcode
  unlock_available_from DATETIME DEFAULT NULL,             -- time-lock start (NULL = no time lock)

  -- NEW: GOOGLE / HUMAN-FRIENDLY LOCATION METADATA
  google_place_id VARCHAR(128) DEFAULT NULL,
  location_label  VARCHAR(255) DEFAULT NULL,  -- e.g. "Cape Town, South Africa"
  country_code    CHAR(2) DEFAULT NULL,       -- "ZA"
  country_name    VARCHAR(100) DEFAULT NULL,  -- "South Africa"
  admin_area_1    VARCHAR(100) DEFAULT NULL,  -- province / state
  admin_area_2    VARCHAR(100) DEFAULT NULL,  -- city / municipality
  location_raw    JSON DEFAULT NULL,          -- store full geocode/places payload

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,   -- NULL = forever, otherwise exact expiry timestamp

  PRIMARY KEY (id),
  KEY idx_memories_owner (owner_id),
  KEY idx_memories_location (latitude, longitude),
  KEY idx_memories_journey (journey_id, journey_step),
  KEY idx_memories_country (country_code),
  KEY idx_memories_place_id (google_place_id),
  KEY idx_memories_unlock_time (unlock_available_from),

  CONSTRAINT fk_memories_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_memories_journey
    FOREIGN KEY (journey_id) REFERENCES journeys(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- MEMORY ASSETS: Images / audio belonging to a memory
CREATE TABLE memory_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  memory_id BIGINT UNSIGNED NOT NULL,
  type ENUM('image','audio','video') NOT NULL,
  storage_key VARCHAR(512) NOT NULL,  -- file path / key for MinIO/S3 later
  mime_type VARCHAR(128) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assets_memory (memory_id),
  CONSTRAINT fk_assets_memory
    FOREIGN KEY (memory_id) REFERENCES memories(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MEMORY UNLOCKS: Log of who unlocked what (once per user/memory)
CREATE TABLE memory_unlocks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  memory_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  unlocked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unlock_latitude DECIMAL(9,6) DEFAULT NULL,
  unlock_longitude DECIMAL(9,6) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_unlock_once (memory_id, user_id),
  KEY idx_unlocks_user (user_id, unlocked_at),
  CONSTRAINT fk_unlocks_memory
    FOREIGN KEY (memory_id) REFERENCES memories(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_unlocks_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SAVED MEMORIES: "Save memory" / "Saved Memories" feature
CREATE TABLE memory_saves (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  memory_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_save_once (memory_id, user_id),
  KEY idx_saves_user (user_id, created_at),
  KEY idx_saves_memory (memory_id),
  CONSTRAINT fk_saves_memory
    FOREIGN KEY (memory_id) REFERENCES memories(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_saves_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FOLLOWERS: one-way.
CREATE TABLE user_followers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  follower_id BIGINT UNSIGNED NOT NULL,
  following_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_follow_pair (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);


-- TARGETED MEMORIES: specific users who can unlock a memory
CREATE TABLE memory_targets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  memory_id BIGINT UNSIGNED NOT NULL,
  target_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_memory_target (memory_id, target_user_id),
  KEY idx_targets_memory (memory_id),
  KEY idx_targets_user (target_user_id),
  CONSTRAINT fk_targets_memory
    FOREIGN KEY (memory_id) REFERENCES memories(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_targets_user
    FOREIGN KEY (target_user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




