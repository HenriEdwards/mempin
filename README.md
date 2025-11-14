Layout refactor (sidebar + full-screen map + memories panel)

Layer 1: UX / memory improvements

Layer 2: Social + visibility

Layer 3: Magic features (targeted memories, journeys, QR, footprints)

You can then tell Codex things like:

“Implement the layout refactor as per the README”
“Now implement Layer 2 backend + frontend.”

🔁 0. Layout Refactor – Sidebar + Full-screen Map
0.1 General layout

Keep React/Vite setup, but change main layout so that:

Left side: collapsible vertical sidebar (Sidebar component).

Center/right: full-viewport map (MapPage).

Top-right (inside map view): floating “Memories” button that opens a side panel listing placed/found memories.

Components:

client/src/components/layout/
  Sidebar.jsx
  TopRightActions.jsx   // holds “Memories”, maybe extra buttons later
  SlidingPanel.jsx      // generic panel for lists

0.2 Sidebar behavior

Default: collapsed (narrow column with icons only).

On hover or on click of a toggle button, expand to show labels.

Use relevant icons (can use a simple icon set or SVGs):

Map (home)

Memories

Profile

Friends

Settings / About

Logo:

When collapsed → small icon (e.g. “M” in a circle).

When expanded → full “MEMLOC” text.

Theme toggle:

Move into bottom of sidebar:

Show current theme name & icon when expanded.

Only icon when collapsed.

Sidebar items:

Map (default/main view)

Memories list (opens the same panel as top-right button)

Profile

Friends

About / Help (simple page or modal)

0.3 Map layout

The map panel fills almost full viewport:

Height = full window height (minus maybe small margin).

Width = full width minus sidebar.

Remove the old tabs under the header (“Place / Placed / Found”) from the main map view.

Instead:

Show a single FAB at bottom-right: “Place memory here”.

Show a “Memories” button at top-right (inside map) that opens a large sliding panel from the right.

0.4 Memories panel (top-right button)

SlidingPanel component opens over the map from the right side (around 35–40% of width on desktop, full width on mobile).

Inside the panel:

Tabs or segmented control:

“Placed”

“Found”

(later: maybe “Nearby”)

Search box (filter by title, tag)

For each list item:

Memory title

Short preview (first line of body)

Badge: Public / Private / Friends / Unlisted

Stats: views (timesFound), unlockedAt / createdAt

Click → opens Memory Details Modal.

🧩 1. Layer 1 – UX & Memory Improvements
1.1 Memory form upgrades

In PlaceMemoryForm:

Add fields:

shortDescription (max ~100 chars; used in list/map preview).

tags (simple multi-select or comma-separated input).

Improve media handling:

Show thumbnail previews for selected images.

Show simple file name for audio files.

Add a radius slider with marks:

20m / 50m / 100m / 200m

Add character counters for title and body.

Backend:

Add columns to memories table (non-breaking):

ALTER TABLE memories
  ADD COLUMN short_description VARCHAR(255) NULL AFTER title,
  ADD COLUMN tags VARCHAR(255) NULL AFTER body;


Update memoryModel.createMemory and mapping to handle:

shortDescription

tags (store as comma-separated string for now).

1.2 Memory Details Modal

Create MemoryDetailsModal.jsx:

Title

Short description

Body

Tags (rendered as pills / chips)

Stats:

visibility

radius

createdAt

timesFound

Map mini-preview with marker and radius.

Gallery:

Horizontal scroll of images.

Audio:

simple HTML5 audio players.

Usage:

From map (click marker → “View details”).

From Memories panel (click list item).

🫂 2. Layer 2 – Social + Visibility

We keep it simple: friends list + “allowed users” support.

2.1 Visibility expansion

Update visibility options from:

public, private, unlisted

to:

public

private

friends

unlisted

DB:

ALTER TABLE memories
  MODIFY COLUMN visibility ENUM('public','private','friends','unlisted') NOT NULL DEFAULT 'public';

2.2 Friends system

Create a minimal friends/contacts concept.

Tables:

CREATE TABLE user_friends (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  friend_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_friend_pair (user_id, friend_user_id),
  CONSTRAINT fk_userfriends_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_userfriends_friend
    FOREIGN KEY (friend_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


We’ll skip invitations/approval for MVP: if you add someone as friend, they count as your friend.

Backend:

Create new model friendsModel.js with:

getFriends(userId)

addFriend(userId, friendEmail):

Look up user by email.

If found, insert into user_friends.

removeFriend(userId, friendId)

Routes:

GET    /api/friends          -> list my friends
POST   /api/friends          -> add by email { email }
DELETE /api/friends/:id      -> remove friend relationship


All require auth.

2.3 Memory allowed users (for “friends” visibility)

Simplified rule:

If visibility = 'public' → everyone can unlock.

If visibility = 'private' → only owner.

If visibility = 'friends' → owner’s friends can unlock.

If visibility = 'unlisted' → only via direct link (plus within radius).

For MVP we can derive “friends” dynamically from user_friends table; no need for memory_allowed_users yet.

Backend changes:

In memoryModel.getNearbyMemories and unlockMemory:

If memory.visibility = 'private' and req.user.id !== owner_id → 403.

If memory.visibility = 'friends':

Check if req.user.id is in user_friends list for owner.

If not → 403.

unlisted is treated like public in nearby only if user has the direct link later; for now, we can exclude unlisted from nearby:

AND m.visibility IN ('public','friends')

2.4 Profile page + stats

Frontend:

Create ProfilePage.jsx:

Show:

name

email

avatar

Stats (from backend):

total memories placed

total memories found

total views on my memories (sum(times_found) for memories I own)

latest memory placed

latest memory found

Backend:

Add endpoint:

GET /api/users/me/stats


Returns:

{
  "placedCount": 5,
  "foundCount": 12,
  "totalViewsOnMyMemories": 34,
  "latestPlaced": { ...minimal memory fields... } | null,
  "latestFound": { ...minimal memory fields... } | null
}


Implement via SQL aggregations using memories + memory_unlocks.

✨ 3. Layer 3 – Magic Features
3.1 Personal / targeted memories

Most of this is already covered by friends + private.

Add one more flavor: “Targeted to a specific person”.

DB:

Add table:

CREATE TABLE memory_targets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  memory_id BIGINT UNSIGNED NOT NULL,
  target_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_memory_target (memory_id, target_user_id),
  CONSTRAINT fk_targets_memory
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  CONSTRAINT fk_targets_user
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


Rule:

If a memory has memory_targets rows:

Only those target users may unlock it (plus owner), respecting the radius.

This can override generic visibility for now (or only allowed when visibility is 'private' or 'friends').

Form UI:

In PlaceMemoryForm, add optional “Select specific recipients”:

Search by email among existing users and/or friends.

For MVP: just input email(s); backend resolves to user IDs.

Backend changes:

New model memoryTargetModel.js to manage targets.

Extend createMemory to accept an optional targetEmails array.

In unlockMemory, if there are targets:

Only owner or target_user_id can unlock; others → 403.

3.2 Journey mode (sequence of locations)

Simplest implementation:

DB:

CREATE TABLE journeys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_journeys_owner (owner_id),
  CONSTRAINT fk_journeys_owner
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE memories
  ADD COLUMN journey_id BIGINT UNSIGNED NULL AFTER owner_id,
  ADD COLUMN journey_step INT NULL AFTER journey_id,
  ADD CONSTRAINT fk_memories_journey
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE SET NULL;


Rules:

A memory may belong to one journey (journey_id + journey_step).

Steps are integers 1..N.

To unlock memory at step N:

User must:

be in radius

and have unlocked step N-1 (unless N=1).

Backend:

Add journeyModel.js:

createJourney({ ownerId, title, description })

getJourney(id)

getJourneySteps(journeyId)

Update createMemory:

Accept optional journeyId + journeyStep.

Update unlockMemory:

If memory is part of a journey and journey_step > 1:

Check memory_unlocks for the previous step memory.

If not unlocked → 403 with { error: 'Previous step not unlocked yet' }.

Frontend:

Add a simple “Journey builder” UI later; for now:

In PlaceMemoryForm, show optional select:

“Add to journey” → choose existing journey or “Create new journey”.

“Step number” input.

In Memory Details Modal:

Show journey info:

“Part 2 of 5 in: Trip to Cape Town”.

3.3 QR unlocks

Concept:

Each memory already has an id.

Public/unlisted/friends/targeted rules still apply.

QR just points to a URL like:

https://yourdomain.com/m/<id>.

Frontend:

Add a button in Memory Details Modal:

“Generate QR code”.

Show QR code in a modal using a simple React QR lib (e.g. qrcode.react) or a minimal implementation:

Input: the share URL.

Keep it simple in MVP:

Visiting /m/:id:

If user is physically near and allowed, attempt to unlock via API (same unlockMemory with client-side geolocation).

If user is far away, show “You’re too far from this memory to unlock it”.

No extra DB needed.

3.4 Public footprints (views & recency)

This is mostly already in place via memory_unlocks.

Frontend:

On map markers and list items:

“Unlocked X times”

“Last unlocked: 2 hours ago” (or “Never unlocked”).

Backend:

memoryModel.getMemoryById and lists already compute times_found.

Extend to also define last_unlocked_at using MAX(unlocked_at) aggregated in the same subquery.

✅ Summary for Codex

You can give Codex this overall command sequence:

Layout phase:

Implement sidebar, full-screen map, top-right memories button with sliding panel as described in section 0.

Layer 1:

Add short_description, tags to memories.

Upgrade memory form, previews, radius slider.

Create Memory Details Modal.

Layer 2:

Extend visibility enum.

Add user_friends table + friends endpoints/UI.

Enforce visibility rules in getNearbyMemories and unlockMemory.

Add profile page + stats endpoint.

Layer 3:

Add memory_targets for specific recipients.

Add journeys (journeys table + journey_id/step) and journey unlock rules.

Add QR share + /m/:id route and QR generator.

Add footprints (timesFound + last unlocked display).