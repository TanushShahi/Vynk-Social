-- Vynk Social Platform Database Schema
-- Phase 1, Phase 2 & Phase 3 Entities (PostgreSQL & SQLite compatible)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL,            -- e.g. "vynk.t7x4k9"
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  cover_url TEXT,
  bio TEXT DEFAULT '',
  is_verified INTEGER DEFAULT 0,
  is_private INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Interests Table
CREATE TABLE IF NOT EXISTS user_interests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  interest TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, interest)
);

-- 3. Follows / Connections Table
CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (follower_id, following_id)
);

-- 4. Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  caption TEXT NOT NULL,
  mood TEXT DEFAULT 'chill',
  audience TEXT DEFAULT 'public',
  tags TEXT,
  is_video INTEGER DEFAULT 0,          -- 1 for vertical short-form video (Vynk Vibes)
  is_collab INTEGER DEFAULT 0,         -- 1 for multi-author Collab Post
  collab_title TEXT,                   -- Title for shared moments, e.g. "GOA 2026"
  audio_title TEXT DEFAULT 'Original Audio',
  views_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Media Table
CREATE TABLE IF NOT EXISTS post_media (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',     -- 'image' | 'video'
  aspect_ratio REAL DEFAULT 1.0,
  thumbnail_url TEXT,
  duration REAL DEFAULT 0,
  alt_text TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- 6. Waves Reactions Table
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL,         -- 'love', 'inspire', 'laugh', 'learn', 'relatable', 'wow', 'curious'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (post_id, user_id)
);

-- 7. Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  parent_id TEXT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 8. Comment Likes Table
CREATE TABLE IF NOT EXISTS comment_likes (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (comment_id, user_id)
);

-- 9. Saved / Bookmarked Posts
CREATE TABLE IF NOT EXISTS saved_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE (user_id, post_id)
);

-- 10. Stories Table (with Story Threads support)
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  caption TEXT DEFAULT '',
  parent_story_id TEXT,                -- Story Threads
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_story_id) REFERENCES stories(id) ON DELETE CASCADE
);

-- 11. Story Views
CREATE TABLE IF NOT EXISTS story_views (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (story_id, user_id)
);

-- 12. Conversations Table (Direct & Group)
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'direct',          -- 'direct' | 'group'
  name TEXT,
  avatar_url TEXT,
  last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Conversation Members Table
CREATE TABLE IF NOT EXISTS conversation_members (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (conversation_id, user_id)
);

-- 14. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  reply_to_id TEXT,
  is_edited INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- 15. Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reaction TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (message_id, user_id, reaction)
);

-- 16. Shared Space Items
CREATE TABLE IF NOT EXISTS shared_space_items (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  media_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 17. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  type TEXT NOT NULL,                  -- 'follow', 'reaction', 'comment', 'message', 'story_thread', 'collab_invite', 'room_invite'
  entity_id TEXT,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================================================
-- PHASE 3 ENTITIES: CAPSULES, COLLABS, SOCIAL ROOMS & HEALTHIER ENGAGEMENT
-- =========================================================================

-- 18. Moment Capsules Table
CREATE TABLE IF NOT EXISTS capsules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,                 -- e.g. "Goa Trip", "College First Year"
  description TEXT DEFAULT '',
  cover_url TEXT NOT NULL,
  category TEXT DEFAULT 'Memories',    -- 'Trip', 'Life Milestone', 'Creative', 'Friendship', 'College'
  privacy TEXT DEFAULT 'public',       -- 'public', 'friends', 'private'
  music_title TEXT,
  location_name TEXT,
  start_date TEXT,
  end_date TEXT,
  is_locked INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 19. Capsule Items Table (Timeline entries within a capsule)
CREATE TABLE IF NOT EXISTS capsule_items (
  id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_type TEXT DEFAULT 'photo',      -- 'photo', 'video', 'text', 'voice', 'note'
  media_url TEXT,
  caption TEXT,
  location_name TEXT,
  date_moment DATETIME DEFAULT CURRENT_TIMESTAMP,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 20. Capsule Collaborators
CREATE TABLE IF NOT EXISTS capsule_collaborators (
  id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'collaborator',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (capsule_id, user_id)
);

-- 21. Post Collaborators (For Collab Posts: Shared Multi-User Posts)
CREATE TABLE IF NOT EXISTS post_collaborators (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'co-author',
  contribution_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (post_id, user_id)
);

-- 22. Social Rooms (Topic-Based Community Spaces)
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  name TEXT NOT NULL,                  -- e.g. "AI & Technology", "Gaming", "Photography"
  description TEXT,
  topic TEXT NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  is_permanent INTEGER DEFAULT 1,
  expires_at DATETIME,
  members_count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 23. Room Members
CREATE TABLE IF NOT EXISTS room_members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',          -- 'creator', 'admin', 'member'
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (room_id, user_id)
);

-- 24. Room Messages & Discussions (with Polls & Voice)
CREATE TABLE IF NOT EXISTS room_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,                     -- 'image', 'video', 'poll', 'voice'
  poll_data TEXT,                      -- JSON: { question: string, options: [{text: string, count: number}] }
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 25. Room Poll Votes
CREATE TABLE IF NOT EXISTS room_poll_votes (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES room_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (message_id, user_id)
);

-- 26. User Achievements & Healthy Social Badges
CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,              -- 'community_builder', 'explorer', 'helpful_creator', 'early_creator'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, badge_id)
);

-- 27. Follow Requests Table (For Private Accounts)
CREATE TABLE IF NOT EXISTS follow_requests (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',       -- 'pending' | 'accepted' | 'rejected'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (follower_id, target_id)
);

-- 28. Account Blocks Table
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (blocker_id, blocked_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_mood ON posts(mood);
CREATE INDEX IF NOT EXISTS idx_posts_is_video ON posts(is_video);
CREATE INDEX IF NOT EXISTS idx_posts_is_collab ON posts(is_collab);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follow_req_target ON follow_requests(target_id, status);
CREATE INDEX IF NOT EXISTS idx_follow_req_follower ON follow_requests(follower_id, status);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_space_conv ON shared_space_items(conversation_id);
CREATE INDEX IF NOT EXISTS idx_capsules_user ON capsules(user_id);
CREATE INDEX IF NOT EXISTS idx_capsule_items ON capsule_items(capsule_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_rooms_topic ON rooms(topic);
CREATE INDEX IF NOT EXISTS idx_room_messages ON room_messages(room_id, created_at ASC);

-- =========================================================================
-- PHASE 4 ENTITIES: ADVANCED AI INTELLIGENCE & PERSONALIZATION
-- =========================================================================

-- 27. Negative Feedback & Hidden Posts Table
CREATE TABLE IF NOT EXISTS hidden_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  reason TEXT DEFAULT 'not_interested',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_hidden_posts_user ON hidden_posts(user_id, post_id);

-- 28. Content Safety Moderation Appeals Table
CREATE TABLE IF NOT EXISTS moderation_appeals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  explanation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_user ON moderation_appeals(user_id, status);

-- 29. User Content & AI Personalization Preferences Table
CREATE TABLE IF NOT EXISTS user_content_preferences (
  user_id TEXT PRIMARY KEY,
  interests TEXT,
  preferred_moods TEXT,
  excluded_topics TEXT,
  muted_tags TEXT,
  muted_creators TEXT,
  sensitive_content_filter INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
