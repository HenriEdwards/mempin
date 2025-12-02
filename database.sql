SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS memory_targets;
DROP TABLE IF EXISTS journeys;
DROP TABLE IF EXISTS user_followers;
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
  visibility ENUM('public','private','followers','unlisted') NOT NULL DEFAULT 'public',

  -- CORE LOCATION (keep using this for map rendering)
  latitude  DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  radius_m INT NOT NULL DEFAULT 50,  -- distance (in meters) required to unlock

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
  expires_at DATETIME NULL,   -- NULL = forever, otherwise exact expiry timestamp,

  PRIMARY KEY (id),
  KEY idx_memories_owner (owner_id),
  KEY idx_memories_location (latitude, longitude),
  KEY idx_memories_journey (journey_id, journey_step),
  KEY idx_memories_country (country_code),
  KEY idx_memories_place_id (google_place_id),

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


INSERT INTO memories 
(owner_id, journey_id, journey_step, title, short_description, body, tags, visibility, latitude, longitude, radius_m)
VALUES
(1,NULL,NULL,'Echo',NULL,NULL,NULL,'public',40.7128,-74.0060,50), -- NYC
(1,NULL,NULL,'Whisper',NULL,NULL,NULL,'public',34.0522,-118.2437,50), -- LA
(1,NULL,NULL,'Pulse',NULL,NULL,NULL,'public',51.5074,-0.1278,50), -- London
(1,NULL,NULL,'Skyline',NULL,NULL,NULL,'public',48.8566,2.3522,50), -- Paris
(1,NULL,NULL,'Rift',NULL,NULL,NULL,'public',35.6895,139.6917,50), -- Tokyo
(1,NULL,NULL,'Horizon',NULL,NULL,NULL,'public',37.7749,-122.4194,50), -- SF
(1,NULL,NULL,'Breeze',NULL,NULL,NULL,'public',52.5200,13.4050,50), -- Berlin
(1,NULL,NULL,'Dawn',NULL,NULL,NULL,'public',41.9028,12.4964,50), -- Rome
(1,NULL,NULL,'Nightfall',NULL,NULL,NULL,'public',55.7558,37.6173,50), -- Moscow
(1,NULL,NULL,'Glint',NULL,NULL,NULL,'public',1.3521,103.8198,50), -- Singapore

(1,NULL,NULL,'Shimmer',NULL,NULL,NULL,'public',28.6139,77.2090,50), -- Delhi
(1,NULL,NULL,'Path',NULL,NULL,NULL,'public',31.2304,121.4737,50), -- Shanghai
(1,NULL,NULL,'Ripple',NULL,NULL,NULL,'public',43.6532,-79.3832,50), -- Toronto
(1,NULL,NULL,'Drop',NULL,NULL,NULL,'public',19.4326,-99.1332,50), -- Mexico City
(1,NULL,NULL,'Sway',NULL,NULL,NULL,'public',-33.8688,151.2093,50), -- Sydney
(1,NULL,NULL,'Flash',NULL,NULL,NULL,'public',-37.8136,144.9631,50), -- Melbourne
(1,NULL,NULL,'Trace',NULL,NULL,NULL,'public',-26.2041,28.0473,50), -- Johannesburg
(1,NULL,NULL,'Drift',NULL,NULL,NULL,'public',-23.5505,-46.6333,50), -- São Paulo
(1,NULL,NULL,'Glow',NULL,NULL,NULL,'public',-34.6037,-58.3816,50), -- Buenos Aires
(1,NULL,NULL,'Note',NULL,NULL,NULL,'public',59.3293,18.0686,50), -- Stockholm

(1,NULL,NULL,'Frame',NULL,NULL,NULL,'public',60.1699,24.9384,50), -- Helsinki
(1,NULL,NULL,'Moment',NULL,NULL,NULL,'public',50.0755,14.4378,50), -- Prague
(1,NULL,NULL,'Spark',NULL,NULL,NULL,'public',52.3676,4.9041,50), -- Amsterdam
(1,NULL,NULL,'Wave',NULL,NULL,NULL,'public',45.4642,9.1900,50), -- Milan
(1,NULL,NULL,'Point',NULL,NULL,NULL,'public',30.0444,31.2357,50), -- Cairo
(1,NULL,NULL,'Lift',NULL,NULL,NULL,'public',24.7136,46.6753,50), -- Riyadh
(1,NULL,NULL,'Tone',NULL,NULL,NULL,'public',25.2048,55.2708,50), -- Dubai
(1,NULL,NULL,'Flick',NULL,NULL,NULL,'public',32.0853,34.7818,50), -- Tel Aviv
(1,NULL,NULL,'Snap',NULL,NULL,NULL,'public',35.6762,139.6503,50), -- Tokyo alt
(1,NULL,NULL,'Drip',NULL,NULL,NULL,'public',34.6937,135.5023,50), -- Osaka

(1,NULL,NULL,'Shape',NULL,NULL,NULL,'public',37.5665,126.9780,50), -- Seoul
(1,NULL,NULL,'Beat',NULL,NULL,NULL,'public',22.3193,114.1694,50), -- Hong Kong
(1,NULL,NULL,'Sight',NULL,NULL,NULL,'public',13.7563,100.5018,50), -- Bangkok
(1,NULL,NULL,'Rest',NULL,NULL,NULL,'public',21.0278,105.8342,50), -- Hanoi
(1,NULL,NULL,'Mark',NULL,NULL,NULL,'public',-1.2921,36.8219,50), -- Nairobi
(1,NULL,NULL,'Still',NULL,NULL,NULL,'public',-22.9068,-43.1729,50), -- Rio
(1,NULL,NULL,'Vibe',NULL,NULL,NULL,'public',4.7110,-74.0721,50), -- Bogota
(1,NULL,NULL,'Pulse2',NULL,NULL,NULL,'public',14.5995,120.9842,50), -- Manila
(1,NULL,NULL,'Hint',NULL,NULL,NULL,'public',-8.4095,115.1889,50), -- Bali
(1,NULL,NULL,'Drift2',NULL,NULL,NULL,'public',35.0116,135.7681,50), -- Kyoto

(1,NULL,NULL,'Soft',NULL,NULL,NULL,'public',-36.8485,174.7633,50), -- Auckland
(1,NULL,NULL,'Arc',NULL,NULL,NULL,'public',25.7617,-80.1918,50), -- Miami
(1,NULL,NULL,'Shift',NULL,NULL,NULL,'public',39.9042,116.4074,50), -- Beijing
(1,NULL,NULL,'Key',NULL,NULL,NULL,'public',40.4168,-3.7038,50), -- Madrid
(1,NULL,NULL,'Sign',NULL,NULL,NULL,'public',33.4484,-112.0740,50), -- Phoenix
(1,NULL,NULL,'Tone2',NULL,NULL,NULL,'public',29.7604,-95.3698,50), -- Houston
(1,NULL,NULL,'Wonder',NULL,NULL,NULL,'public',43.7696,11.2558,50), -- Florence
(1,NULL,NULL,'Bloom',NULL,NULL,NULL,'public',59.9139,10.7522,50), -- Oslo
(1,NULL,NULL,'Leaf',NULL,NULL,NULL,'public',56.9496,24.1052,50), -- Riga
(1,NULL,NULL,'Calm',NULL,NULL,NULL,'public',55.6761,12.5683,50); -- Copenhagen


INSERT INTO memories 
(owner_id, journey_id, journey_step, title, short_description, body, tags, visibility, latitude, longitude, radius_m)
VALUES
(1,NULL,NULL,'Pathway',NULL,NULL,NULL,'public',33.7490,-84.3880,50), -- Atlanta
(1,NULL,NULL,'Stillness',NULL,NULL,NULL,'public',47.6062,-122.3321,50), -- Seattle
(1,NULL,NULL,'Quiet',NULL,NULL,NULL,'public',35.2271,-80.8431,50), -- Charlotte
(1,NULL,NULL,'Turn',NULL,NULL,NULL,'public',45.5017,-73.5673,50), -- Montreal
(1,NULL,NULL,'Edge',NULL,NULL,NULL,'public',25.6866,-100.3161,50), -- Monterrey
(1,NULL,NULL,'Flow',NULL,NULL,NULL,'public',-12.0464,-77.0428,50), -- Lima
(1,NULL,NULL,'Softlight',NULL,NULL,NULL,'public',6.5244,3.3792,50), -- Lagos
(1,NULL,NULL,'Murmur',NULL,NULL,NULL,'public',52.2297,21.0122,50), -- Warsaw
(1,NULL,NULL,'Pause',NULL,NULL,NULL,'public',53.3498,-6.2603,50), -- Dublin
(1,NULL,NULL,'Gentle',NULL,NULL,NULL,'public',50.1109,8.6821,50), -- Frankfurt

(1,NULL,NULL,'Float',NULL,NULL,NULL,'public',35.1796,129.0756,50), -- Busan
(1,NULL,NULL,'Trace2',NULL,NULL,NULL,'public',31.7683,35.2137,50), -- Jerusalem
(1,NULL,NULL,'Sparkle',NULL,NULL,NULL,'public',55.9533,-3.1883,50), -- Edinburgh
(1,NULL,NULL,'Night Air',NULL,NULL,NULL,'public',43.2220,76.8512,50), -- Almaty
(1,NULL,NULL,'Wind',NULL,NULL,NULL,'public',22.5726,88.3639,50), -- Kolkata
(1,NULL,NULL,'Mint',NULL,NULL,NULL,'public',-4.4419,15.2663,50), -- Kinshasa
(1,NULL,NULL,'QuietStep',NULL,NULL,NULL,'public',33.8938,35.5018,50), -- Beirut
(1,NULL,NULL,'Bend',NULL,NULL,NULL,'public',13.0827,80.2707,50), -- Chennai
(1,NULL,NULL,'Signal',NULL,NULL,NULL,'public',-17.8249,31.0492,50), -- Harare
(1,NULL,NULL,'Balance',NULL,NULL,NULL,'public',-3.3731,29.9189,50), -- Bujumbura

(1,NULL,NULL,'Pulse3',NULL,NULL,NULL,'public',55.2708,-106.3468,50), -- Saskatchewan (rural Canada)
(1,NULL,NULL,'Rise',NULL,NULL,NULL,'public',46.2044,6.1432,50), -- Geneva
(1,NULL,NULL,'Breeze2',NULL,NULL,NULL,'public',47.4979,19.0402,50), -- Budapest
(1,NULL,NULL,'Motion',NULL,NULL,NULL,'public',25.0343,-77.3963,50), -- Nassau (Bahamas)
(1,NULL,NULL,'Layer',NULL,NULL,NULL,'public',64.9631,-19.0208,50), -- Iceland
(1,NULL,NULL,'Mix',NULL,NULL,NULL,'public',18.1096,-77.2975,50), -- Jamaica
(1,NULL,NULL,'Flash2',NULL,NULL,NULL,'public',40.6401,22.9444,50), -- Thessaloniki
(1,NULL,NULL,'Drop2',NULL,NULL,NULL,'public',59.4370,24.7536,50), -- Tallinn
(1,NULL,NULL,'Hint2',NULL,NULL,NULL,'public',45.8150,15.9819,50), -- Zagreb
(1,NULL,NULL,'Softstep',NULL,NULL,NULL,'public',41.3260,19.8187,50), -- Tirana

(1,NULL,NULL,'Echo2',NULL,NULL,NULL,'public',35.4676,-97.5164,50), -- Oklahoma City
(1,NULL,NULL,'Blip',NULL,NULL,NULL,'public',34.0007,-81.0348,50), -- Columbia
(1,NULL,NULL,'Glance',NULL,NULL,NULL,'public',17.3850,78.4867,50), -- Hyderabad
(1,NULL,NULL,'Tide',NULL,NULL,NULL,'public',60.4720,8.4689,50), -- Norway interior
(1,NULL,NULL,'Shade',NULL,NULL,NULL,'public',27.7172,85.3240,50), -- Kathmandu
(1,NULL,NULL,'SoftWind',NULL,NULL,NULL,'public',34.1526,-118.3259,50), -- Glendale (LA area)
(1,NULL,NULL,'Wisp',NULL,NULL,NULL,'public',36.1627,-86.7816,50), -- Nashville
(1,NULL,NULL,'Glide',NULL,NULL,NULL,'public',38.6270,-90.1994,50), -- St. Louis
(1,NULL,NULL,'Glow2',NULL,NULL,NULL,'public',25.7617,-80.1918,50), -- Miami alt
(1,NULL,NULL,'Calm2',NULL,NULL,NULL,'public',52.4064,16.9252,50), -- Poznań

(1,NULL,NULL,'Tiny',NULL,NULL,NULL,'public',24.4539,54.3773,50), -- Abu Dhabi
(1,NULL,NULL,'EchoPoint',NULL,NULL,NULL,'public',3.1390,101.6869,50), -- Kuala Lumpur
(1,NULL,NULL,'Soothe',NULL,NULL,NULL,'public',-15.7797,-47.9297,50), -- Brasilia
(1,NULL,NULL,'Glimmer',NULL,NULL,NULL,'public',39.1568,117.1260,50), -- Tianjin
(1,NULL,NULL,'Air',NULL,NULL,NULL,'public',59.9127,30.3158,50), -- St. Petersburg
(1,NULL,NULL,'Curve',NULL,NULL,NULL,'public',-29.8587,31.0218,50), -- Durban
(1,NULL,NULL,'Point2',NULL,NULL,NULL,'public',50.9375,6.9603,50), -- Cologne
(1,NULL,NULL,'Shade2',NULL,NULL,NULL,'public',46.9479,7.4474,50), -- Bern
(1,NULL,NULL,'Beat2',NULL,NULL,NULL,'public',43.6510,41.0207,50), -- Grozny
(1,NULL,NULL,'Field',NULL,NULL,NULL,'public',30.6954,76.8227,50); -- Chandigarh


INSERT INTO memories 
(owner_id, journey_id, journey_step, title, short_description, body, tags, visibility, latitude, longitude, radius_m)
VALUES
-- AFRICA (15)
(1,NULL,NULL,'Savanna',NULL,NULL,NULL,'public',-1.9579,30.1127,50), -- Rwanda
(1,NULL,NULL,'Dune',NULL,NULL,NULL,'public',24.4539,54.3773,50), -- Libya desert region
(1,NULL,NULL,'Oasis',NULL,NULL,NULL,'public',26.8206,30.8025,50), -- Egypt interior
(1,NULL,NULL,'Drum',NULL,NULL,NULL,'public',9.0820,8.6753,50), -- Nigeria central
(1,NULL,NULL,'SunTrail',NULL,NULL,NULL,'public',14.7167,-17.4677,50), -- Dakar
(1,NULL,NULL,'RedDust',NULL,NULL,NULL,'public',-18.6657,35.5296,50), -- Mozambique
(1,NULL,NULL,'EchoHill',NULL,NULL,NULL,'public',0.3476,32.5825,50), -- Kampala
(1,NULL,NULL,'WarmWind',NULL,NULL,NULL,'public',-4.0435,39.6682,50), -- Mombasa
(1,NULL,NULL,'Stone',NULL,NULL,NULL,'public',-6.7924,39.2083,50), -- Dar es Salaam
(1,NULL,NULL,'Trail',NULL,NULL,NULL,'public',15.5007,32.5599,50), -- Khartoum
(1,NULL,NULL,'Glint3',NULL,NULL,NULL,'public',-33.9249,18.4241,50), -- Cape Town
(1,NULL,NULL,'Whisper3',NULL,NULL,NULL,'public',-20.1667,57.5000,50), -- Mauritius
(1,NULL,NULL,'Steppe',NULL,NULL,NULL,'public',-25.7461,28.1881,50), -- Pretoria
(1,NULL,NULL,'ShadePeak',NULL,NULL,NULL,'public',-8.8383,13.2344,50), -- Luanda
(1,NULL,NULL,'Bloom3',NULL,NULL,NULL,'public',12.6392,-8.0029,50), -- Bamako

-- AUSTRALIA (5)
(1,NULL,NULL,'Outback',NULL,NULL,NULL,'public',-25.2744,133.7751,50), -- Central AU
(1,NULL,NULL,'Surf',NULL,NULL,NULL,'public',-33.8688,151.2093,50), -- Sydney
(1,NULL,NULL,'Dustline',NULL,NULL,NULL,'public',-37.8136,144.9631,50), -- Melbourne
(1,NULL,NULL,'CoastRun',NULL,NULL,NULL,'public',-27.4698,153.0251,50), -- Brisbane
(1,NULL,NULL,'HorizonAU',NULL,NULL,NULL,'public',-31.9523,115.8613,50); -- Perth


INSERT IGNORE INTO memory_unlocks (memory_id, user_id)
SELECT m.id, 1
FROM memories m
WHERE m.id IN (
    SELECT id FROM memories WHERE title IN (
        'Savanna',
        'Dune',
        'Oasis',
        'Drum',
        'SunTrail',
        'RedDust',
        'EchoHill',
        'WarmWind',
        'Stone',
        'Trail',
        'Glint3',
        'Whisper3',
        'Steppe',
        'ShadePeak',
        'Bloom3'
    )
);
