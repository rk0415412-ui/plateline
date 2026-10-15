/**
 * PlateLine SQLite CRUD Operations
 *
 * Enforces:
 * - Timestamps stored strictly as LOCAL strings (HARD RULE 6)
 * - Updates only modify fields explicitly passed; timestamp remains untouched unless explicitly changed.
 * - Source tracking on nutrition and neutral wording throughout.
 */

import { getDatabase } from './database';
import { nowLocalInputValue } from '../lib/time';

function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ==========================================
// 1. READINGS CRUD
// ==========================================

/**
 * Create a new glucose reading.
 * @param {object} params
 * @param {string} [params.id]
 * @param {number} params.value
 * @param {string} [params.unit='mg/dL']
 * @param {string} [params.recordedAt] Local date-time string
 * @param {string|null} [params.context] Optional context
 * @param {string|null} [params.notes] Optional user notes
 * @returns {Promise<object>} Created reading row
 */
export async function createReading({
  id = generateId('read'),
  value,
  unit = 'mg/dL',
  recordedAt = nowLocalInputValue(),
  context = null,
  notes = null,
}) {
  const db = await getDatabase();
  const now = nowLocalInputValue();
  const numValue = Number(value);

  await db.runAsync(
    `INSERT INTO readings (id, value, unit, recordedAt, context, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, numValue, unit, recordedAt, context, notes, now, now]
  );

  return getReadingById(id);
}

/**
 * Retrieve a reading by its ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getReadingById(id) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM readings WHERE id = ?`,
    [id]
  );
  return row || null;
}

/**
 * Update an existing reading.
 * STABILITY GUARANTEE: Does NOT touch recordedAt unless explicitly provided in fields!
 *
 * @param {string} id
 * @param {object} fields Fields to update (e.g. { notes: 'New note' })
 * @returns {Promise<object|null>}
 */
export async function updateReading(id, fields) {
  const db = await getDatabase();
  const existing = await getReadingById(id);
  if (!existing) {
    throw new Error(`Reading not found with id: ${id}`);
  }

  const updates = [];
  const params = [];

  if (fields.value !== undefined) {
    updates.push('value = ?');
    params.push(Number(fields.value));
  }
  if (fields.unit !== undefined) {
    updates.push('unit = ?');
    params.push(fields.unit);
  }
  if (fields.recordedAt !== undefined) {
    updates.push('recordedAt = ?');
    params.push(fields.recordedAt);
  }
  if (fields.context !== undefined) {
    updates.push('context = ?');
    params.push(fields.context);
  }
  if (fields.notes !== undefined) {
    updates.push('notes = ?');
    params.push(fields.notes);
  }

  // Always update the updatedAt field
  const now = nowLocalInputValue();
  updates.push('updatedAt = ?');
  params.push(now);

  params.push(id);

  await db.runAsync(
    `UPDATE readings SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return getReadingById(id);
}

/**
 * Delete a reading by ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteReading(id) {
  const db = await getDatabase();
  const result = await db.runAsync(`DELETE FROM readings WHERE id = ?`, [id]);
  return result.changes > 0;
}

/**
 * List readings in a date range (local string comparison).
 * @param {string} startDate e.g. '2026-10-01T00:00:00'
 * @param {string} endDate e.g. '2026-10-15T23:59:59'
 * @returns {Promise<Array<object>>}
 */
export async function listReadingsByDateRange(startDate, endDate) {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM readings
     WHERE recordedAt >= ? AND recordedAt <= ?
     ORDER BY recordedAt DESC`,
    [startDate, endDate]
  );
  return rows || [];
}

/**
 * List all readings in reverse-chronological order.
 * @returns {Promise<Array<object>>}
 */
export async function listAllReadings() {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM readings ORDER BY recordedAt DESC`
  );
  return rows || [];
}

// ==========================================
// 2. MEALS CRUD
// ==========================================

/**
 * Create a new meal record.
 * @param {object} params
 * @param {string} [params.id]
 * @param {string} [params.recordedAt] Local date-time string
 * @param {string} params.description
 * @param {string|null} [params.photoPath]
 * @param {object|string|null} [params.nutrition] JSON string or object
 * @param {string|null} [params.therapyNotes] Pill/insulin timing notes
 * @param {string} [params.analysisStatus='manual']
 * @returns {Promise<object>}
 */
export async function createMeal({
  id = generateId('meal'),
  recordedAt = nowLocalInputValue(),
  description,
  photoPath = null,
  nutrition = null,
  therapyNotes = null,
  analysisStatus = 'manual',
}) {
  const db = await getDatabase();
  const now = nowLocalInputValue();

  const nutritionStr = typeof nutrition === 'object' && nutrition !== null
    ? JSON.stringify(nutrition)
    : nutrition;

  await db.runAsync(
    `INSERT INTO meals (id, recordedAt, description, photoPath, nutrition, therapyNotes, analysisStatus, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, recordedAt, description, photoPath, nutritionStr, therapyNotes, analysisStatus, now, now]
  );

  return getMealById(id);
}

/**
 * Retrieve a meal by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getMealById(id) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM meals WHERE id = ?`,
    [id]
  );
  if (!row) return null;

  // Parse nutrition JSON safely if present
  let parsedNutrition = null;
  if (row.nutrition) {
    try {
      parsedNutrition = JSON.parse(row.nutrition);
    } catch (e) {
      parsedNutrition = row.nutrition;
    }
  }

  return {
    ...row,
    nutritionParsed: parsedNutrition,
  };
}

/**
 * Update an existing meal.
 * Does NOT touch recordedAt unless explicitly passed in fields.
 *
 * @param {string} id
 * @param {object} fields
 * @returns {Promise<object|null>}
 */
export async function updateMeal(id, fields) {
  const db = await getDatabase();
  const existing = await getMealById(id);
  if (!existing) {
    throw new Error(`Meal not found with id: ${id}`);
  }

  const updates = [];
  const params = [];

  if (fields.recordedAt !== undefined) {
    updates.push('recordedAt = ?');
    params.push(fields.recordedAt);
  }
  if (fields.description !== undefined) {
    updates.push('description = ?');
    params.push(fields.description);
  }
  if (fields.photoPath !== undefined) {
    updates.push('photoPath = ?');
    params.push(fields.photoPath);
  }
  if (fields.nutrition !== undefined) {
    updates.push('nutrition = ?');
    const nutritionStr = typeof fields.nutrition === 'object' && fields.nutrition !== null
      ? JSON.stringify(fields.nutrition)
      : fields.nutrition;
    params.push(nutritionStr);
  }
  if (fields.therapyNotes !== undefined) {
    updates.push('therapyNotes = ?');
    params.push(fields.therapyNotes);
  }
  if (fields.analysisStatus !== undefined) {
    updates.push('analysisStatus = ?');
    params.push(fields.analysisStatus);
  }

  const now = nowLocalInputValue();
  updates.push('updatedAt = ?');
  params.push(now);

  params.push(id);

  await db.runAsync(
    `UPDATE meals SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return getMealById(id);
}

/**
 * Delete a meal by ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteMeal(id) {
  const db = await getDatabase();
  const result = await db.runAsync(`DELETE FROM meals WHERE id = ?`, [id]);
  return result.changes > 0;
}

/**
 * List meals in a date range.
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<Array<object>>}
 */
export async function listMealsByDateRange(startDate, endDate) {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM meals
     WHERE recordedAt >= ? AND recordedAt <= ?
     ORDER BY recordedAt DESC`,
    [startDate, endDate]
  );
  return (rows || []).map(row => {
    let parsedNutrition = null;
    if (row.nutrition) {
      try {
        parsedNutrition = JSON.parse(row.nutrition);
      } catch (e) {
        parsedNutrition = row.nutrition;
      }
    }
    return { ...row, nutritionParsed: parsedNutrition };
  });
}

/**
 * List all meals in reverse-chronological order.
 * @returns {Promise<Array<object>>}
 */
export async function listAllMeals() {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM meals ORDER BY recordedAt DESC`
  );
  return (rows || []).map(row => {
    let parsedNutrition = null;
    if (row.nutrition) {
      try {
        parsedNutrition = JSON.parse(row.nutrition);
      } catch (e) {
        parsedNutrition = row.nutrition;
      }
    }
    return { ...row, nutritionParsed: parsedNutrition };
  });
}

// ==========================================
// 3. PHOTOS CRUD
// ==========================================

export async function savePhoto({ key, filePath, blob = null }) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO photos (key, filePath, blob) VALUES (?, ?, ?)`,
    [key, filePath, blob]
  );
  return { key, filePath, blob };
}

export async function getPhotoByKey(key) {
  const db = await getDatabase();
  return db.getFirstAsync(`SELECT * FROM photos WHERE key = ?`, [key]);
}

export async function deletePhoto(key) {
  const db = await getDatabase();
  const result = await db.runAsync(`DELETE FROM photos WHERE key = ?`, [key]);
  return result.changes > 0;
}

// ==========================================
// 4. ANALYSES CRUD
// ==========================================

export async function saveAnalysis({
  id = generateId('ana'),
  mealId,
  items,
  uncertaintyNotes = null,
  model = 'gemini-vision',
  analysedAt = nowLocalInputValue(),
  acceptedByUser = 0,
}) {
  const db = await getDatabase();
  const itemsStr = typeof items === 'object' && items !== null ? JSON.stringify(items) : items;

  await db.runAsync(
    `INSERT INTO analyses (id, mealId, items, uncertaintyNotes, model, analysedAt, acceptedByUser)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, mealId, itemsStr, uncertaintyNotes, model, analysedAt, acceptedByUser ? 1 : 0]
  );

  return { id, mealId, items, uncertaintyNotes, model, analysedAt, acceptedByUser };
}

export async function getAnalysisByMealId(mealId) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM analyses WHERE mealId = ? ORDER BY analysedAt DESC`,
    [mealId]
  );
  if (!row) return null;
  let parsedItems = null;
  if (row.items) {
    try {
      parsedItems = JSON.parse(row.items);
    } catch (e) {
      parsedItems = row.items;
    }
  }
  return { ...row, itemsParsed: parsedItems };
}

export async function deleteAnalysis(id) {
  const db = await getDatabase();
  const result = await db.runAsync(`DELETE FROM analyses WHERE id = ?`, [id]);
  return result.changes > 0;
}

// ==========================================
// 5. SETTINGS CRUD
// ==========================================

export async function getSetting(key, defaultValue = null) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(`SELECT value FROM settings WHERE key = ?`, [key]);
  if (!row) return defaultValue;
  try {
    return JSON.parse(row.value);
  } catch (e) {
    return row.value;
  }
}

export async function setSetting(key, value) {
  const db = await getDatabase();
  const valueStr = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [key, valueStr]
  );
  return value;
}

export async function getAllSettings() {
  const db = await getDatabase();
  const rows = await db.getAllAsync(`SELECT key, value FROM settings`);
  const settingsObj = {};
  for (const r of rows || []) {
    try {
      settingsObj[r.key] = JSON.parse(r.value);
    } catch (e) {
      settingsObj[r.key] = r.value;
    }
  }
  return settingsObj;
}

// ==========================================
// 6. TOTAL USER DATA RESET (Hard Rule)
// ==========================================

/**
 * Wipes all user data tables completely.
 * Used for "Delete all my data" with typed confirmation.
 */
export async function deleteAllUserData() {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM readings;
    DELETE FROM meals;
    DELETE FROM photos;
    DELETE FROM analyses;
  `);
  return true;
}
