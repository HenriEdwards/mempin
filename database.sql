SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS memory_targets;
DROP TABLE IF EXISTS journeys;
DROP TABLE IF EXISTS user_friends;
DROP TABLE IF EXISTS memory_unlocks;
DROP TABLE IF EXISTS memory_assets;
DROP TABLE IF EXISTS memories;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- USERS: Registered users via Google OAuth
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  google_id VARCHAR(64) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) DEFAULT NULL,
  avatar_url VARCHAR(512) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- JOURNEYS: Optional sequences of memories
CREATE TABLE journeys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
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
  body TEXT DEFAULT NULL,
  tags VARCHAR(255) DEFAULT NULL, -- comma-separated tags, eg: "love,travel"
  visibility ENUM('public','private','friends','unlisted') NOT NULL DEFAULT 'public',
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  radius_m INT NOT NULL DEFAULT 50,  -- distance (in meters) required to unlock
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_memories_owner (owner_id),
  KEY idx_memories_location (latitude, longitude),
  KEY idx_memories_journey (journey_id, journey_step),
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
  type ENUM('image','audio') NOT NULL,
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

-- FRIENDS: simple one-way friend relationship (A adds B)
CREATE TABLE user_friends (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  friend_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_friend_pair (user_id, friend_user_id),
  KEY idx_userfriends_user (user_id),
  CONSTRAINT fk_userfriends_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_userfriends_friend
    FOREIGN KEY (friend_user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
