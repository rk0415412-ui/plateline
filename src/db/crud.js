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

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function interpolateSql(sql, params = []) {
  if (!params || params.length === 0) return sql;
  const parts = sql.split('?');
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    result += parts[i];
    if (i < params.length) {
      result += escapeSqlValue(params[i]);
    }
  }
  return result;
}

/**
 * Executes a write query (INSERT, UPDATE, DELETE, REPLACE) safely via db.execAsync
 * with interpolated SQL to completely avoid NativeDatabase.prepareAsync bugs on Android.
 */
export async function safeRun(db, sql, params = []) {
  const rawSql = interpolateSql(sql, params);
  await db.execAsync(rawSql);
  return { changes: 1, lastInsertRowId: 0 };
}

/**
 * Safely fetches the first matching row without calling prepareAsync with parameter arrays.
 */
export async function safeFirst(db, sql, params = []) {
  const rawSql = interpolateSql(sql, params);
  const rows = await db.getAllAsync(rawSql);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Safely fetches all matching rows without calling prepareAsync with parameter arrays.
 */
export async function safeAll(db, sql, params = []) {
  const rawSql = interpolateSql(sql, params);
  const rows = await db.getAllAsync(rawSql);
  return rows || [];
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
  medicine_status = 'prefer_not_to_say',
}) {
  const db = await getDatabase();
  const now = nowLocalInputValue();
  const numValue = Number(value);

  await safeRun(
    db,
    `INSERT INTO readings (id, value, unit, recordedAt, context, notes, medicine_status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, numValue, unit, recordedAt, context, notes, medicine_status, now, now]
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
  return safeFirst(db, `SELECT * FROM readings WHERE id = ?`, [id]);
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

  if (fields.medicine_status !== undefined) {
    updates.push('medicine_status = ?');
    params.push(fields.medicine_status);
  }

  // Always update the updatedAt field
  const now = nowLocalInputValue();
  updates.push('updatedAt = ?');
  params.push(now);

  params.push(id);

  await safeRun(
    db,
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
  const numId = Number(id);
  if (!isNaN(numId)) {
    const res = await safeRun(db, `DELETE FROM readings WHERE id = ? OR id = ?`, [id, numId]);
    return res.changes > 0;
  }
  const result = await safeRun(db, `DELETE FROM readings WHERE id = ?`, [id]);
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
  return safeAll(
    db,
    `SELECT * FROM readings
     WHERE recordedAt >= ? AND recordedAt <= ?
     ORDER BY recordedAt DESC`,
    [startDate, endDate]
  );
}

/**
 * List all readings in reverse-chronological order.
 * @returns {Promise<Array<object>>}
 */
export async function listAllReadings() {
  const db = await getDatabase();
  return safeAll(db, `SELECT * FROM readings ORDER BY recordedAt DESC`);
}

// ==========================================
// 2. MEALS CRUD
// ==========================================

/**
 * Insert a meal record according to the Milestone schema:
 * (id INTEGER PRIMARY KEY, meal_type TEXT, description TEXT, carbs INTEGER NULL, photo_uri TEXT NULL, note TEXT NULL, created_at TEXT)
 *
 * @param {object} params
 * @param {string} params.meal_type 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
 * @param {string} params.description
 * @param {number|null} [params.carbs]
 * @param {string|null} [params.photo_uri]
 * @param {string|null} [params.note]
 * @param {string} [params.created_at]
 * @returns {Promise<object>}
 */
export async function insertMeal({
  meal_type,
  description,
  carbs = null,
  photo_uri = null,
  note = null,
  created_at = null,
}) {
  const db = await getDatabase();
  const timestamp = created_at || nowLocalInputValue();
  const numericCarbs =
    carbs !== null && carbs !== undefined && String(carbs).trim() !== '' && !isNaN(Number(carbs))
      ? Math.round(Number(carbs))
      : null;

  const cols = await db.getAllAsync('PRAGMA table_info(meals);');
  const colNames = cols.map((c) => c.name);

  if (colNames.includes('recordedAt') && colNames.includes('createdAt')) {
    const id = generateId('meal');
    const result = await safeRun(
      db,
      `INSERT INTO meals (id, recordedAt, description, photoPath, therapyNotes, createdAt, updatedAt, meal_type, carbs, photo_uri, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        timestamp,
        description,
        photo_uri,
        note,
        timestamp,
        timestamp,
        meal_type,
        numericCarbs,
        photo_uri,
        note,
        timestamp,
      ]
    );
    return {
      id: result.lastInsertRowId || id,
      meal_type,
      description,
      carbs: numericCarbs,
      photo_uri,
      note,
      created_at: timestamp,
    };
  } else {
    const result = await safeRun(
      db,
      `INSERT INTO meals (meal_type, description, carbs, photo_uri, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [meal_type, description, numericCarbs, photo_uri, note, timestamp]
    );
    return {
      id: result.lastInsertRowId,
      meal_type,
      description,
      carbs: numericCarbs,
      photo_uri,
      note,
      created_at: timestamp,
    };
  }
}

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

  await safeRun(
    db,
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
  const numId = Number(id);
  let row = null;
  if (!isNaN(numId)) {
    row = await safeFirst(db, `SELECT * FROM meals WHERE id = ? OR id = ?`, [id, numId]);
  } else {
    row = await safeFirst(db, `SELECT * FROM meals WHERE id = ?`, [id]);
  }
  if (!row) return null;

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
    recordedAt: row.recordedAt || row.created_at,
    created_at: row.created_at || row.recordedAt,
    photo_uri: row.photo_uri || row.photoPath,
    photoPath: row.photo_uri || row.photoPath,
    note: row.note || row.therapyNotes,
    nutritionParsed: parsedNutrition,
  };
}

/**
 * Update an existing meal.
 * Does NOT touch recordedAt unless explicitly passed in fields.
 *
 * @param {string|number} id
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
  if (fields.created_at !== undefined) {
    updates.push('created_at = ?');
    params.push(fields.created_at);
  }
  if (fields.description !== undefined) {
    updates.push('description = ?');
    params.push(fields.description);
  }
  if (fields.meal_type !== undefined) {
    updates.push('meal_type = ?');
    params.push(fields.meal_type);
  }
  if (fields.carbs !== undefined) {
    updates.push('carbs = ?');
    params.push(fields.carbs);
  }
  if (fields.photo_uri !== undefined) {
    updates.push('photo_uri = ?');
    params.push(fields.photo_uri);
  }
  if (fields.photoPath !== undefined) {
    updates.push('photoPath = ?');
    params.push(fields.photoPath);
  }
  if (fields.note !== undefined) {
    updates.push('note = ?');
    params.push(fields.note);
  }
  if (fields.therapyNotes !== undefined) {
    updates.push('therapyNotes = ?');
    params.push(fields.therapyNotes);
  }

  if (updates.length === 0) {
    return getMealById(id);
  }

  const numId = Number(id);
  const targetId = isNaN(numId) ? id : numId;

  await safeRun(
    db,
    `UPDATE meals SET ${updates.join(', ')} WHERE id = ?`,
    [...params, targetId]
  );

  return getMealById(id);
}

/**
 * Delete a meal by ID.
 * @param {string|number} id
 * @returns {Promise<boolean>}
 */
export async function deleteMeal(id) {
  const db = await getDatabase();
  const numId = Number(id);
  if (!isNaN(numId)) {
    const res = await safeRun(db, `DELETE FROM meals WHERE id = ? OR id = ?`, [id, numId]);
    return res.changes > 0;
  }
  const result = await safeRun(db, `DELETE FROM meals WHERE id = ?`, [id]);
  return result.changes > 0;
}

/**
 * List meals in a date range.
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<Array<object>>}
 */
export async function listMealsByDateRange(startDate, endDate) {
  try {
    const all = await listAllMeals();
    return all.filter((meal) => {
      const d = meal.recordedAt || meal.created_at;
      return d && d >= startDate && d <= endDate;
    });
  } catch (err) {
    console.warn('Error in listMealsByDateRange:', err);
    return [];
  }
}

/**
 * List all meals in reverse-chronological order.
 * @returns {Promise<Array<object>>}
 */
export async function listAllMeals() {
  const db = await getDatabase();
  try {
    const rows = await safeAll(db, `SELECT * FROM meals`);
    const formatted = (rows || []).map((row) => {
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
        id: String(row.id),
        recordedAt: row.recordedAt || row.created_at,
        created_at: row.created_at || row.recordedAt,
        photo_uri: row.photo_uri || row.photoPath,
        photoPath: row.photo_uri || row.photoPath,
        note: row.note || row.therapyNotes,
        therapyNotes: row.therapyNotes || row.note,
        nutritionParsed: parsedNutrition,
      };
    });

    formatted.sort((a, b) => {
      const timeA = a.recordedAt || a.created_at || '';
      const timeB = b.recordedAt || b.created_at || '';
      return timeB.localeCompare(timeA);
    });

    return formatted;
  } catch (err) {
    console.warn('Error in listAllMeals:', err);
    return [];
  }
}


// ==========================================
// 3. PHOTOS CRUD
// ==========================================

export async function savePhoto({ key, filePath, blob = null }) {
  const db = await getDatabase();
  await safeRun(
    db,
    `INSERT OR REPLACE INTO photos (key, filePath, blob) VALUES (?, ?, ?)`,
    [key, filePath, blob]
  );
  return { key, filePath, blob };
}

export async function getPhotoByKey(key) {
  const db = await getDatabase();
  return safeFirst(db, `SELECT * FROM photos WHERE key = ?`, [key]);
}

export async function deletePhoto(key) {
  const db = await getDatabase();
  const result = await safeRun(db, `DELETE FROM photos WHERE key = ?`, [key]);
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

  await safeRun(
    db,
    `INSERT INTO analyses (id, mealId, items, uncertaintyNotes, model, analysedAt, acceptedByUser)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, mealId, itemsStr, uncertaintyNotes, model, analysedAt, acceptedByUser ? 1 : 0]
  );

  return { id, mealId, items, uncertaintyNotes, model, analysedAt, acceptedByUser };
}

export async function getAnalysisByMealId(mealId) {
  const db = await getDatabase();
  const row = await safeFirst(
    db,
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
  const result = await safeRun(db, `DELETE FROM analyses WHERE id = ?`, [id]);
  return result.changes > 0;
}

// ==========================================
// 5. SETTINGS CRUD
// ==========================================

export async function getSetting(key, defaultValue = null) {
  const db = await getDatabase();
  const row = await safeFirst(db, `SELECT value FROM settings WHERE key = ?`, [key]);
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
  await safeRun(
    db,
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [key, valueStr]
  );
  return value;
}

export async function getAllSettings() {
  const db = await getDatabase();
  const rows = await safeAll(db, `SELECT key, value FROM settings`);
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
