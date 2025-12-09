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








////////////////////////////////////////

INSERT INTO journeys (id, owner_id, title, description)
VALUES
(1, 1, 'Centurion Day Trip', 'Spots around Centurion'),
(2, 1, 'Pretoria Heritage Walk', 'Landmarks in Pretoria'),
(3, 1, 'Johannesburg Urban Trail', 'Well-known Joburg areas');

------------------------------------------------------------
-- MEMORIES (3 per journey)
------------------------------------------------------------
INSERT INTO memories (
  id, owner_id, journey_id, journey_step,
  title, short_description, latitude, longitude,
  visibility, unlock_requires_location
)
VALUES
-- CENTURION
(1, 1, 1, 1, 'Irene Dairy Farm', 'Chill morning', -25.8798, 28.2275, 'public', 0),
(2, 1, 1, 2, 'Centurion Mall Lake', 'Evening stroll', -25.8551, 28.1903, 'public', 0),
(3, 1, 1, 3, 'Hennops Trail', 'Hiking memory', -25.8455, 27.9988, 'public', 0),

-- PRETORIA
(4, 1, 2, 1, 'Union Buildings', 'Great view', -25.7402, 28.2120, 'public', 0),
(5, 1, 2, 2, 'Loftus Stadium', 'Match day', -25.7532, 28.2220, 'public', 0),
(6, 1, 2, 3, 'Menlyn Maine', 'Coffee stop', -25.7876, 28.2750, 'public', 0),

-- JOHANNESBURG
(7, 1, 3, 1, 'Nelson Mandela Square', 'Famous statue', -26.1076, 28.0567, 'public', 0),
(8, 1, 3, 2, 'Zoo Lake', 'Walk around lake', -26.1453, 28.0307, 'public', 0),
(9, 1, 3, 3, 'Constitution Hill', 'Historic site', -26.1899, 28.0418, 'public', 0);

------------------------------------------------------------
-- UNLOCK ALL FOR USER 1
------------------------------------------------------------
INSERT INTO memory_unlocks (memory_id, user_id)
VALUES
(1,1),(2,1),(3,1),
(4,1),(5,1),(6,1),
(7,1),(8,1),(9,1);
///////////////////////////////////////////////////////////////////




















/* =======================
   JOURNEYS (South Africa)
   ======================= */
INSERT INTO journeys (owner_id, title, description)
VALUES
  (1, 'Cape Peninsula Weekender', 'Two-day road trip around Cape Town and the peninsula.'),
  (1, 'Kruger Safari Adventure',  'Game drives and bush walks in Kruger National Park.');


/* =======================
   20 GLOBAL PINS (MEMORIES)
   - 5 of these are in South Africa
   - owner_id = 1, no journey
   ======================= */
INSERT INTO memories (
  owner_id,
  journey_id,
  journey_step,
  title,
  short_description,
  body,
  tags,
  visibility,
  latitude,
  longitude,
  radius_m,
  unlock_requires_location,
  unlock_requires_followers,
  unlock_requires_passcode,
  unlock_passcode_hash,
  unlock_available_from,
  google_place_id,
  location_label,
  country_code,
  country_name,
  admin_area_1,
  admin_area_2,
  location_raw,
  is_active,
  expires_at
)
VALUES
  -- World pins
  (1, NULL, NULL, 'Times Square Night Walk', 'First time in New York City.', NULL, 'travel,city,usa', 'public',
   40.758000, -73.985500, 50, 1, 0, 0, NULL, NULL, NULL,
   'Times Square, New York, USA', 'US', 'United States', 'New York', 'New York', NULL, 1, NULL),

  (1, NULL, NULL, 'Sunrise over Tower Bridge', 'Cold morning by the Thames.', NULL, 'travel,uk,river', 'public',
   51.505500, -0.075400, 50, 1, 0, 0, NULL, NULL, NULL,
   'Tower Bridge, London, UK', 'GB', 'United Kingdom', 'England', 'London', NULL, 1, NULL),

  (1, NULL, NULL, 'Shibuya Crossing Madness', 'The famous scramble crossing.', NULL, 'japan,city,night', 'public',
   35.659500, 139.700500, 50, 1, 0, 0, NULL, NULL, NULL,
   'Shibuya Crossing, Tokyo, Japan', 'JP', 'Japan', 'Tokyo', 'Shibuya', NULL, 1, NULL),

  (1, NULL, NULL, 'Eiffel Tower Picnic', 'Cheese, wine, and a perfect view.', NULL, 'paris,romance', 'public',
   48.858370, 2.294481, 50, 1, 0, 0, NULL, NULL, NULL,
   'Eiffel Tower, Paris, France', 'FR', 'France', 'Île-de-France', 'Paris', NULL, 1, NULL),

  (1, NULL, NULL, 'Sydney Opera House Stroll', 'Walked around Circular Quay.', NULL, 'australia,harbour', 'public',
   -33.856784, 151.215297, 50, 1, 0, 0, NULL, NULL, NULL,
   'Sydney Opera House, Sydney, Australia', 'AU', 'Australia', 'New South Wales', 'Sydney', NULL, 1, NULL),

  (1, NULL, NULL, 'Rio Copacabana Sunset', 'Beach football and caipirinhas.', NULL, 'beach,brazil,sunset', 'public',
   -22.971177, -43.182543, 50, 1, 0, 0, NULL, NULL, NULL,
   'Copacabana Beach, Rio de Janeiro, Brazil', 'BR', 'Brazil', 'Rio de Janeiro', 'Rio de Janeiro', NULL, 1, NULL),

  (1, NULL, NULL, 'Cairo Pyramids Visit', 'Saw the Great Pyramid of Giza.', NULL, 'history,egypt', 'public',
   29.979235, 31.134202, 80, 1, 0, 0, NULL, NULL, NULL,
   'Giza Pyramid Complex, Giza, Egypt', 'EG', 'Egypt', 'Giza Governorate', 'Giza', NULL, 1, NULL),

  (1, NULL, NULL, 'Toronto CN Tower View', 'City lights from the observation deck.', NULL, 'canada,city,view', 'public',
   43.642566, -79.387057, 50, 1, 0, 0, NULL, NULL, NULL,
   'CN Tower, Toronto, Canada', 'CA', 'Canada', 'Ontario', 'Toronto', NULL, 1, NULL),

  (1, NULL, NULL, 'Berlin Wall Memorial', 'Walked along the remaining section.', NULL, 'germany,history', 'public',
   52.535100, 13.390300, 50, 1, 0, 0, NULL, NULL, NULL,
   'Berlin Wall Memorial, Berlin, Germany', 'DE', 'Germany', 'Berlin', 'Berlin', NULL, 1, NULL),

  (1, NULL, NULL, 'Dubai Marina Night Cruise', 'Boats, skyscrapers, and neon.', NULL, 'uae,night,city', 'public',
   25.080000, 55.140000, 60, 1, 0, 0, NULL, NULL, NULL,
   'Dubai Marina, Dubai, UAE', 'AE', 'United Arab Emirates', 'Dubai', 'Dubai', NULL, 1, NULL),

  (1, NULL, NULL, 'Mumbai Street Food Tour', 'Chaat, vada pav, and chaos.', NULL, 'india,food,street', 'public',
   19.076000, 72.877700, 80, 1, 0, 0, NULL, NULL, NULL,
   'South Mumbai, Mumbai, India', 'IN', 'India', 'Maharashtra', 'Mumbai', NULL, 1, NULL),

  (1, NULL, NULL, 'Singapore Marina Bay Walk', 'Evening walk along the bay.', NULL, 'singapore,city,night', 'public',
   1.283333, 103.860000, 60, 1, 0, 0, NULL, NULL, NULL,
   'Marina Bay, Singapore', 'SG', 'Singapore', 'Singapore', 'Singapore', NULL, 1, NULL),

  (1, NULL, NULL, 'Zócalo Mexico City', 'Historic centre of CDMX.', NULL, 'mexico,city,history', 'public',
   19.432608, -99.133209, 60, 1, 0, 0, NULL, NULL, NULL,
   'Zócalo, Mexico City, Mexico', 'MX', 'Mexico', 'Ciudad de México', 'Mexico City', NULL, 1, NULL),

  (1, NULL, NULL, 'Hong Kong Peak View', 'Tram ride to the Peak.', NULL, 'hongkong,view,city', 'public',
   22.275800, 114.145500, 60, 1, 0, 0, NULL, NULL, NULL,
   'Victoria Peak, Hong Kong', 'HK', 'Hong Kong', 'Hong Kong', 'Central and Western', NULL, 1, NULL),

  (1, NULL, NULL, 'Rome Colosseum Tour', 'Ancient arena in the middle of Rome.', NULL, 'italy,history,ruins', 'public',
   41.890210, 12.492231, 50, 1, 0, 0, NULL, NULL, NULL,
   'Colosseum, Rome, Italy', 'IT', 'Italy', 'Lazio', 'Rome', NULL, 1, NULL),

  -- SOUTH AFRICA PINS (5)
  (1, NULL, NULL, 'Cape Town City Bowl', 'Coffee and co-working in town.', NULL, 'southafrica,cape town,city', 'public',
   -33.924870, 18.424055, 80, 1, 0, 0, NULL, NULL, NULL,
   'Cape Town CBD, South Africa', 'ZA', 'South Africa', 'Western Cape', 'Cape Town', NULL, 1, NULL),

  (1, NULL, NULL, 'Johannesburg Skyline', 'Evening drive past the CBD.', NULL, 'southafrica,johannesburg,city', 'public',
   -26.204103, 28.047304, 80, 1, 0, 0, NULL, NULL, NULL,
   'Johannesburg, South Africa', 'ZA', 'South Africa', 'Gauteng', 'Johannesburg', NULL, 1, NULL),

  (1, NULL, NULL, 'Durban Beachfront Walk', 'Promenade along the Golden Mile.', NULL, 'southafrica,beach,durban', 'public',
   -29.858681, 31.021839, 80, 1, 0, 0, NULL, NULL, NULL,
   'North Beach, Durban, South Africa', 'ZA', 'South Africa', 'KwaZulu-Natal', 'Durban', NULL, 1, NULL),

  (1, NULL, NULL, 'Pretoria Union Buildings', 'Views over the city.', NULL, 'southafrica,pretoria,history', 'public',
   -25.740170, 28.212530, 80, 1, 0, 0, NULL, NULL, NULL,
   'Union Buildings, Pretoria, South Africa', 'ZA', 'South Africa', 'Gauteng', 'Pretoria', NULL, 1, NULL),

  (1, NULL, NULL, 'Kruger Rest Camp Stop', 'Hyenas in the distance at night.', NULL, 'southafrica,kruger,safari', 'public',
   -24.993000, 31.596000, 150, 1, 0, 0, NULL, NULL, NULL,
   'Skukuza Area, Kruger National Park, South Africa', 'ZA', 'South Africa', 'Mpumalanga', 'Kruger National Park', NULL, 1, NULL);


/* =======================
   JOURNEY MEMORIES (SA)
   2 journeys × ~6 memories each
   ======================= */

-- Journey 1: Cape Peninsula Weekender (journeys.id = 1)
INSERT INTO memories (
  owner_id,
  journey_id,
  journey_step,
  title,
  short_description,
  body,
  tags,
  visibility,
  latitude,
  longitude,
  radius_m,
  unlock_requires_location,
  unlock_requires_followers,
  unlock_requires_passcode,
  unlock_passcode_hash,
  unlock_available_from,
  google_place_id,
  location_label,
  country_code,
  country_name,
  admin_area_1,
  admin_area_2,
  location_raw,
  is_active,
  expires_at
)
VALUES
  (1, 1, 1, 'Day 1: V&A Waterfront Start', 'Met up at the clock tower.', NULL, 'journey,cape town,day1', 'public',
   -33.903000, 18.420000, 60, 1, 0, 0, NULL, NULL, NULL,
   'V&A Waterfront, Cape Town, South Africa', 'ZA', 'South Africa', 'Western Cape', 'Cape Town', NULL, 1, NULL),

  (1, 1, 2, 'Cable Car to Table Mountain', 'Clouds rolling over the top.', NULL, 'journey,table mountain,hike', 'public',
   -33.962800, 18.409800, 80, 1, 0, 0, NULL, NULL, NULL,
   'Table Mountain Aerial Cableway, Cape Town', 'ZA', 'South Africa', 'Western Cape', 'Cape Town', NULL, 1, NULL),

  (1, 1, 3, 'Camps Bay Sundowners', 'Beach, cocktails, and waves.', NULL, 'journey,beach,sunset', 'public',
   -33.951000, 18.377000, 80, 1, 0, 0, NULL, NULL, NULL,
   'Camps Bay Beach, Cape Town, South Africa', 'ZA', 'South Africa', 'Western Cape', 'Cape Town', NULL, 1, NULL),

  (1, 1, 4, 'Chapman''s Peak Drive Stop', 'Stopped at a viewpoint for photos.', NULL, 'journey,roadtrip,view', 'public',
   -34.105000, 18.350000, 80, 1, 0, 0, NULL, NULL, NULL,
   'Chapman''s Peak Drive Viewpoint, Western Cape', 'ZA', 'South Africa', 'Western Cape', 'Noordhoek', NULL, 1, NULL),

  (1, 1, 5, 'Boulders Beach Penguins', 'Penguins waddling around the rocks.', NULL, 'journey,penguins,beach', 'public',
   -34.197000, 18.451000, 80, 1, 0, 0, NULL, NULL, NULL,
   'Boulders Beach, Simon''s Town, South Africa', 'ZA', 'South Africa', 'Western Cape', 'Simon''s Town', NULL, 1, NULL),

  (1, 1, 6, 'Cape Point Finish', 'Windy viewpoint at the end of Africa.', NULL, 'journey,cape point,finish', 'public',
   -34.356800, 18.497000, 100, 1, 0, 0, NULL, NULL, NULL,
   'Cape Point, Table Mountain National Park, South Africa', 'ZA', 'South Africa', 'Western Cape', 'Cape Point', NULL, 1, NULL);


-- Journey 2: Kruger Safari Adventure (journeys.id = 2)
INSERT INTO memories (
  owner_id,
  journey_id,
  journey_step,
  title,
  short_description,
  body,
  tags,
  visibility,
  latitude,
  longitude,
  radius_m,
  unlock_requires_location,
  unlock_requires_followers,
  unlock_requires_passcode,
  unlock_passcode_hash,
  unlock_available_from,
  google_place_id,
  location_label,
  country_code,
  country_name,
  admin_area_1,
  admin_area_2,
  location_raw,
  is_active,
  expires_at
)
VALUES
  (1, 2, 1, 'Arrive at Kruger Gate', 'Checked in and grabbed maps.', NULL, 'journey,kruger,arrival', 'public',
   -24.985000, 31.484000, 120, 1, 0, 0, NULL, NULL, NULL,
   'Paul Kruger Gate, Kruger National Park, South Africa', 'ZA', 'South Africa', 'Mpumalanga', 'Kruger National Park', NULL, 1, NULL),

  (1, 2, 2, 'First Afternoon Game Drive', 'Saw impala, giraffes, and zebras.', NULL, 'journey,safari,wildlife', 'public',
   -24.990000, 31.560000, 200, 1, 0, 0, NULL, NULL, NULL,
   'Near Skukuza, Kruger National Park, South Africa', 'ZA', 'South Africa', 'Mpumalanga', 'Kruger National Park', NULL, 1, NULL),

  (1, 2, 3, 'Early Morning Lion Sighting', 'Two lions on the road at sunrise.', NULL, 'journey,lions,sunrise', 'public',
   -25.020000, 31.580000, 200, 1, 0, 0, NULL, NULL, NULL,
   'Sabi River Road, Kruger National Park, South Africa', 'ZA', 'South Africa', 'Mpumalanga', 'Kruger National Park', NULL, 1, NULL),

  (1, 2, 4, 'Breakfast at Skukuza Camp', 'Breakfast with vervet monkeys watching.', NULL, 'journey,breakfast,camp', 'public',
   -24.993500, 31.593500, 120, 1, 0, 0, NULL, NULL, NULL,
   'Skukuza Rest Camp, Kruger National Park, South Africa', 'ZA', 'South Africa', 'Mpumalanga', 'Skukuza', NULL, 1, NULL),

  (1, 2, 5, 'Sunset at Lower Sabie', 'Orange sky over the river.', NULL, 'journey,sunset,river', 'public',
   -25.118000, 31.922000, 150, 1, 0, 0, NULL, NULL, NULL,
   'Lower Sabie Rest Camp, Kruger National Park, South Africa', 'ZA', 'South Africa', 'Mpumalanga', 'Lower Sabie', NULL, 1, NULL),

  (1, 2, 6, 'Last Night Braai', 'Braai at the bungalow, hyenas in the distance.', NULL, 'journey,braai,campfire', 'public',
   -24.995000, 31.595000, 150, 1, 0, 0, NULL, NULL, NULL,
   'Skukuza Bungalows, Kruger National Park, South Africa', 'ZA', 'South Africa', 'Mpumalanga', 'Skukuza', NULL, 1, NULL);


/* =======================
   UNLOCK ALL MEMORIES FOR USER 1
   ======================= */

INSERT INTO memory_unlocks (memory_id, user_id, unlocked_at, unlock_latitude, unlock_longitude)
SELECT 
    id,
    1,
    NOW(),
    latitude,
    longitude
FROM memories;