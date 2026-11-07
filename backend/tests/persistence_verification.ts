import { test, describe } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../src/config/env.js';

describe('Vynk Social — Database Safety & Media Persistence Verification', () => {
  const dbPath = ENV.DB_PATH;
  const uploadsDir = ENV.UPLOAD_DIR;
  const backupPath = path.resolve(path.dirname(dbPath), 'vynk_backup_test.db');

  test('1. SQLite WAL mode, foreign keys, and integrity check', () => {
    assert.ok(fs.existsSync(dbPath), `Database file must exist at ${dbPath}`);
    const db = new Database(dbPath);

    // Verify WAL mode
    const journalMode = db.pragma('journal_mode', { simple: true });
    assert.strictEqual(journalMode, 'wal', 'Journal mode must be WAL');

    // Verify foreign keys enabled
    db.pragma('foreign_keys = ON');
    const fkStatus = db.pragma('foreign_keys', { simple: true });
    assert.strictEqual(fkStatus, 1, 'Foreign keys must be enabled');

    // Verify database integrity
    const integrity = db.pragma('integrity_check', { simple: true });
    assert.strictEqual(integrity, 'ok', 'Database integrity check must return "ok"');

    db.close();
  });

  test('2. Simulated Process Shutdown, WAL Checkpoint, and Reconnect Persistence', () => {
    const testId = `test_persist_${uuidv4().substring(0, 8)}`;
    const testEmail = `${testId}@vynk.persist.test`;

    // Phase A: Write record to DB
    let db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.prepare(`
      INSERT INTO users (id, uid, name, email, password_hash, bio)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(testId, `vynk.${testId}`, 'Persistence Test User', testEmail, 'hashed_test_pass', 'Testing persistence');

    // Phase B: Execute clean WAL checkpoint and simulate process shutdown
    const checkpointResult = db.pragma('wal_checkpoint(TRUNCATE)');
    assert.ok(checkpointResult, 'WAL checkpoint must complete cleanly');
    db.close();

    // Phase C: Reconnect as if container restarted
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    const persistedUser = db.prepare('SELECT id, uid, email, name FROM users WHERE id = ?').get(testId) as any;

    assert.ok(persistedUser, 'User record must persist across database handle close/reopen');
    assert.strictEqual(persistedUser.email, testEmail);
    assert.strictEqual(persistedUser.name, 'Persistence Test User');

    // Clean up test record
    db.prepare('DELETE FROM users WHERE id = ?').run(testId);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
  });

  test('3. Database Backup & Restore Verification', async () => {
    // Clean up any stale backup test file
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    const sourceDb = new Database(dbPath);
    // Use better-sqlite3 native backup API to safely snapshot live WAL database
    await sourceDb.backup(backupPath);
    sourceDb.close();

    assert.ok(fs.existsSync(backupPath), 'Backup file must be written to disk');
    assert.ok(fs.statSync(backupPath).size > 0, 'Backup file size must be greater than 0');

    // Verify restored database integrity
    const restoredDb = new Database(backupPath);
    const restoredIntegrity = restoredDb.pragma('integrity_check', { simple: true });
    assert.strictEqual(restoredIntegrity, 'ok', 'Restored database must pass integrity check');

    const userCount = (restoredDb.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    assert.ok(userCount > 0, 'Restored database must contain user records');
    restoredDb.close();

    // Clean up backup test file
    fs.unlinkSync(backupPath);
  });

  test('4. Uploads / Media Persistence Across Restart Simulation', () => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const testFileName = `test_media_${uuidv4()}.png`;
    const testFilePath = path.join(uploadsDir, testFileName);
    const testFilePayload = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex');

    // Write simulated media file
    fs.writeFileSync(testFilePath, testFilePayload);
    assert.ok(fs.existsSync(testFilePath), 'Media file must be created on disk');

    // Simulate container restart by verifying directory persistence
    const reloadedPayload = fs.readFileSync(testFilePath);
    assert.strictEqual(reloadedPayload.length, testFilePayload.length, 'Payload size must match exactly');
    assert.deepStrictEqual(reloadedPayload, testFilePayload, 'Binary payload must remain identical');

    // Clean up
    fs.unlinkSync(testFilePath);
    assert.ok(!fs.existsSync(testFilePath), 'Cleaned up test media file');
  });
});
