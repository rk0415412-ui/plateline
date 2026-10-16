/**
 * PlateLine SQLite Database Connection and Schema Definition
 *
 * HARD RULE 1: All user data stays in on-device SQLite. No cloud DB, no sync.
 * HARD RULE 2: Glucose values and history NEVER leave the device.
 */

import * as SQLite from 'expo-sqlite';
import { nowLocalInputValue } from '../lib/time';

const DB_NAME = 'plateline.db';

let dbInstance = null;
let dbInitPromise = null;

/**
 * Open or retrieve the singleton SQLite database instance.
 * Thread-safe and race-condition protected via dbInitPromise mutex.
 * @returns {Promise<SQLite.SQLiteDatabase>}
 */
export async function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // Enable WAL mode for high performance and integrity
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await initSchema(db);
      dbInstance = db;
      return db;
    } catch (err) {
      console.error('getDatabase initialization error:', err);
      dbInitPromise = null;
      dbInstance = null;
      throw err;
    }
  })();

  return dbInitPromise;
}

/**
 * Initialize all database tables if not already created.
 * @param {SQLite.SQLiteDatabase} db
 */
export async function initSchema(db) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS readings (
      id TEXT PRIMARY KEY NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'mg/dL',
      recordedAt TEXT NOT NULL,
      context TEXT,
      notes TEXT,
      medicine_status TEXT DEFAULT 'prefer_not_to_say',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY NOT NULL,
      recordedAt TEXT NOT NULL,
      description TEXT NOT NULL,
      photoPath TEXT,
      photo_uri TEXT,
      nutrition TEXT,
      carbs INTEGER,
      meal_type TEXT,
      note TEXT,
      therapyNotes TEXT,
      analysisStatus TEXT DEFAULT 'manual',
      created_at TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      key TEXT PRIMARY KEY NOT NULL,
      filePath TEXT NOT NULL,
      blob TEXT
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY NOT NULL,
      mealId TEXT,
      items TEXT,
      uncertaintyNotes TEXT,
      model TEXT,
      analysedAt TEXT,
      acceptedByUser INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_readings_recordedAt ON readings(recordedAt);
    CREATE INDEX IF NOT EXISTS idx_meals_recordedAt ON meals(recordedAt);
  `);

  // Non-destructive column migrations for backwards compatibility with any existing device schema
  const migrations = [
    'ALTER TABLE readings ADD COLUMN medicine_status TEXT DEFAULT "prefer_not_to_say";',
    'ALTER TABLE meals ADD COLUMN meal_type TEXT;',
    'ALTER TABLE meals ADD COLUMN description TEXT;',
    'ALTER TABLE meals ADD COLUMN carbs INTEGER;',
    'ALTER TABLE meals ADD COLUMN photo_uri TEXT;',
    'ALTER TABLE meals ADD COLUMN photoPath TEXT;',
    'ALTER TABLE meals ADD COLUMN note TEXT;',
    'ALTER TABLE meals ADD COLUMN therapyNotes TEXT;',
    'ALTER TABLE meals ADD COLUMN nutrition TEXT;',
    'ALTER TABLE meals ADD COLUMN analysisStatus TEXT DEFAULT "manual";',
    'ALTER TABLE meals ADD COLUMN created_at TEXT;',
    'ALTER TABLE meals ADD COLUMN recordedAt TEXT;',
    'ALTER TABLE meals ADD COLUMN createdAt TEXT;',
    'ALTER TABLE meals ADD COLUMN updatedAt TEXT;',
  ];

  for (const sql of migrations) {
    try {
      await db.execAsync(sql);
    } catch (e) {
      // Column already exists or table exists - ignore safely
    }
  }

  await initDefaultSettings(db);
}

/**
 * Initialize default settings if unset
 * @param {SQLite.SQLiteDatabase} db
 */
async function initDefaultSettings(db) {
  try {
    const defaultUnitRows = await db.getAllAsync("SELECT value FROM settings WHERE key = 'unit';");
    if (!defaultUnitRows || defaultUnitRows.length === 0) {
      const now = nowLocalInputValue();
      await db.execAsync(`
        INSERT OR IGNORE INTO settings (key, value) VALUES ('unit', 'mg/dL');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('targetRange', '{"min":70,"max":140}');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('aiConsentGiven', 'false');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('initializedAt', '${now}');
      `);
    }
  } catch (err) {
    console.warn('initDefaultSettings warning:', err);
  }
}

/**
 * Resets the database connection safely without corrupting native handles
 */
export function resetDatabaseConnection() {
  dbInitPromise = null;
  // Keep dbInstance if active to prevent Android NativeDatabase null pointer exceptions
}
