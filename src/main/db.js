/**
 * Database module — SQLite via better-sqlite3.
 *
 * All DB queries go through this module. Handles schema creation,
 * migrations, and FTS5 virtual table for full-text search.
 */
import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/** @type {Database.Database | null} */
let db = null;

/**
 * Returns the active database instance.
 * @returns {Database.Database | null}
 */
export function getDb() {
  return db;
}

/**
 * Initializes the SQLite database, creates tables, and sets up FTS5 triggers.
 */
export async function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbDir = join(userDataPath, 'data');

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = join(dbDir, 'opencowork.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createSchema();
  createFTS();
  runMigrations();

  return db;
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      workspace TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT 'New Conversation',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
      content TEXT NOT NULL DEFAULT '',
      tool_name TEXT,
      tool_input TEXT,
      tool_output TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'done', 'failed', 'cancelled')),
      title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace);
  `);
}

function createFTS() {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      content_rowid='rowid',
      tokenize='porter unicode61'
    );
  `);

  const triggerExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='trigger' AND name='messages_ai'"
  ).get();

  if (!triggerExists) {
    db.exec(`
      CREATE TRIGGER messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, content) VALUES (NEW.rowid, NEW.content);
      END;

      CREATE TRIGGER messages_ad AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', OLD.rowid, OLD.content);
      END;

      CREATE TRIGGER messages_au AFTER UPDATE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', OLD.rowid, OLD.content);
        INSERT INTO messages_fts(rowid, content) VALUES (NEW.rowid, NEW.content);
      END;
    `);
  }
}

function runMigrations() {
  const currentVersion = db.prepare(
    'SELECT MAX(version) as v FROM migrations'
  ).get()?.v || 0;

  const migrations = [
    // Migration 1: baseline (already handled by createSchema)
  ];

  for (let i = currentVersion; i < migrations.length; i++) {
    const migration = migrations[i];
    db.transaction(() => {
      migration();
      db.prepare('INSERT INTO migrations (version) VALUES (?)').run(i + 1);
    })();
    console.log(`Applied migration ${i + 1}`);
  }
}

/**
 * Inserts a message into the database.
 * @param {object} msg
 * @returns {object}
 */
export function insertMessage(msg) {
  const stmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, tool_name, tool_input, tool_output, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    msg.id,
    msg.conversationId,
    msg.role,
    msg.content || '',
    msg.toolName || null,
    msg.toolInput ? JSON.stringify(msg.toolInput) : null,
    msg.toolOutput || null,
    msg.timestamp || new Date().toISOString()
  );
  return msg;
}

/**
 * Updates a task's status.
 * @param {string} taskId
 * @param {string} status
 */
export function updateTaskStatus(taskId, status) {
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, taskId);
}

/**
 * Creates a new task record.
 * @param {object} task
 * @returns {object}
 */
export function createTask(task) {
  db.prepare(
    'INSERT INTO tasks (id, conversation_id, status, title, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(task.id, task.conversationId || null, task.status || 'queued', task.title, task.createdAt || new Date().toISOString());
  return task;
}
