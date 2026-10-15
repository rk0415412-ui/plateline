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

/**
 * Open or retrieve the singleton SQLite database instance.
 * @returns {Promise<SQLite.SQLiteDatabase>}
 */
export async function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  // Enable WAL mode for high performance and integrity
  await dbInstance.execAsync('PRAGMA journal_mode = WAL;');
  await initSchema(dbInstance);
  return dbInstance;
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
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY NOT NULL,
      recordedAt TEXT NOT NULL,
      description TEXT NOT NULL,
      photoPath TEXT,
      nutrition TEXT,
      therapyNotes TEXT,
      analysisStatus TEXT DEFAULT 'manual',
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

  await initDefaultSettings(db);
}

/**
 * Initialize default settings if unset
 * @param {SQLite.SQLiteDatabase} db
 */
async function initDefaultSettings(db) {
  const defaultUnit = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', ['unit']);
  if (!defaultUnit) {
    const now = nowLocalInputValue();
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      ['unit', 'mg/dL']
    );
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      ['targetRange', JSON.stringify({ min: 70, max: 140 })]
    );
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      ['aiConsentGiven', 'false']
    );
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      ['language', 'en']
    );
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      ['initializedAt', now]
    );
  }
}

/**
 * Resets the database connection (useful for tests or app reload simulation)
 */
export function resetDatabaseConnection() {
  dbInstance = null;
}
