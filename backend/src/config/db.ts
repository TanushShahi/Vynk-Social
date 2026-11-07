import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ENV } from './env.js';

const dbDir = path.dirname(ENV.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to SQLite
export const db = new Database(ENV.DB_PATH);

// Enable WAL mode & foreign keys for performance and data integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Migration helper to safely add missing columns if upgrading schema
 */
function runMigrations() {
  const tableColumns: Record<string, string[]> = {
    users: [
      "ALTER TABLE users ADD COLUMN is_private INTEGER DEFAULT 0"
    ],
    posts: [
      "ALTER TABLE posts ADD COLUMN is_video INTEGER DEFAULT 0",
      "ALTER TABLE posts ADD COLUMN is_collab INTEGER DEFAULT 0",
      "ALTER TABLE posts ADD COLUMN collab_title TEXT",
      "ALTER TABLE posts ADD COLUMN audio_title TEXT DEFAULT 'Original Audio'",
      "ALTER TABLE posts ADD COLUMN views_count INTEGER DEFAULT 0"
    ],
    stories: [
      "ALTER TABLE stories ADD COLUMN parent_story_id TEXT"
    ]
  };

  for (const [table, alterStatements] of Object.entries(tableColumns)) {
    // Check if table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (tableExists) {
      for (const stmt of alterStatements) {
        try {
          db.exec(stmt);
        } catch {
          // Column already exists, safe to ignore
        }
      }
    }
  }

  // Ensure follow_requests and blocks tables exist
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS follow_requests (
        id TEXT PRIMARY KEY,
        follower_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (follower_id, target_id)
      );
      CREATE INDEX IF NOT EXISTS idx_follow_req_target ON follow_requests(target_id, status);
      CREATE INDEX IF NOT EXISTS idx_follow_req_follower ON follow_requests(follower_id, status);

      CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY,
        blocker_id TEXT NOT NULL,
        blocked_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (blocker_id, blocked_id)
      );
      CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
      CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

      -- Phase 4: Negative Feedback (Hidden / Disliked Posts)
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

      -- Phase 4: AI Content Moderation Appeals
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

      -- Phase 4: User Content & AI Personalization Preferences
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
    `);

    // Add any missing columns to existing tables
    const safeAddCols = [
      'ALTER TABLE moderation_appeals ADD COLUMN updated_at DATETIME;',
      'ALTER TABLE moderation_appeals ADD COLUMN explanation TEXT;',
      'ALTER TABLE user_content_preferences ADD COLUMN interests TEXT;',
      'ALTER TABLE user_content_preferences ADD COLUMN excluded_topics TEXT;',
      'ALTER TABLE user_content_preferences ADD COLUMN sensitive_content_filter INTEGER DEFAULT 1;'
    ];
    for (const alterSql of safeAddCols) {
      try {
        db.exec(alterSql);
      } catch {
        // column already exists
      }
    }
  } catch (err) {
    console.warn('Migration warning for new tables:', err);
  }
}

/**
 * Initializes database tables using schema.sql
 */
export function initDatabase() {
  // First run any migrations on existing tables
  runMigrations();

  const schemaPath = path.resolve(process.cwd(), '..', 'database', 'schema.sql');
  const localSchemaPath = path.resolve(process.cwd(), 'schema.sql');
  
  let sql = '';
  if (fs.existsSync(schemaPath)) {
    sql = fs.readFileSync(schemaPath, 'utf-8');
  } else if (fs.existsSync(localSchemaPath)) {
    sql = fs.readFileSync(localSchemaPath, 'utf-8');
  } else {
    console.warn('schema.sql not found, tables may already exist.');
    return;
  }

  // Execute entire script
  db.exec(sql);
}

// Transparent query helpers
export const query = {
  get: <T = any>(sql: string, params: any[] = []): T | undefined => {
    const stmt = db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  },
  all: <T = any>(sql: string, params: any[] = []): T[] => {
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
  },
  run: (sql: string, params: any[] = []): Database.RunResult => {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  },
  transaction: <T>(fn: () => T): T => {
    return db.transaction(fn)();
  }
};
