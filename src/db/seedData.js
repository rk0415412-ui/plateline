/**
 * PlateLine 25-Day Comprehensive Dummy Data Seeder
 *
 * Provides:
 * - 25 days of continuous longitudinal data (readings + meals + medication status)
 * - Authentic Indian cuisine with local image assets, accurate carb counts, and neutral descriptions
 * - Multi-factor readings (blood glucose + context + medicine status + local timestamps)
 */

import { getDatabase } from './database';
import { safeRun, safeFirst } from './crud';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

/**
 * Ensures meal photos from assets are copied to FileSystem.documentDirectory
 * so they have real local file URIs for offline viewing.
 */
async function getLocalPhotoUri(assetRequire, fileName) {
  try {
    const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!docDir) return null;

    const targetUri = `${docDir}meals_${fileName}`;
    const info = await FileSystem.getInfoAsync(targetUri);
    if (info && info.exists) {
      return targetUri;
    }

    const asset = Asset.fromModule(assetRequire);
    await asset.downloadAsync();
    if (asset.localUri) {
      await FileSystem.copyAsync({
        from: asset.localUri,
        to: targetUri,
      });
      return targetUri;
    }
  } catch (err) {
    console.warn(`Could not prepare local asset for ${fileName}:`, err);
  }
  return null;
}

export async function seed25DaysData(force = false) {
  const db = await getDatabase();

  // Check existing count if not forced
  if (!force) {
    const existing = await safeFirst(db, 'SELECT COUNT(*) as count FROM readings');
    if (existing && existing.count >= 20) {
      return { seeded: false, reason: 'Already has sufficient data' };
    }
  }

  // Clear existing if force
  if (force) {
    await safeRun(db, 'DELETE FROM readings');
    await safeRun(db, 'DELETE FROM meals');
  }

  // Prepare local photo URIs for authentic Indian meals
  const thaliUri = await getLocalPhotoUri(require('../../assets/meals/thali.jpg'), 'thali.jpg');
  const idliUri = await getLocalPhotoUri(require('../../assets/meals/idli.jpg'), 'idli.jpg');
  const khichdiUri = await getLocalPhotoUri(require('../../assets/meals/khichdi.jpg'), 'khichdi.jpg');

  const now = new Date();

  // Indian meal templates for 25 days rotation
  const breakfastTemplates = [
    { meal_type: 'Breakfast', description: '3 Steamed Idlis with hot vegetable sambar & fresh coconut chutney', carbs: 36, photo: idliUri, note: 'South Indian homestyle, low oil' },
    { meal_type: 'Breakfast', description: 'Poha with roasted peanuts, mustard seeds & curry leaves', carbs: 42, photo: null, note: 'Home cooked with green chillies & lemon' },
    { meal_type: 'Breakfast', description: 'Moong Dal Cheela with fresh mint-coriander chutney', carbs: 22, photo: null, note: 'High protein diabetic breakfast' },
    { meal_type: 'Breakfast', description: '2 Methi Thepla with homemade low-fat curd', carbs: 32, photo: null, note: 'Fenugreek leaves with whole wheat' },
    { meal_type: 'Breakfast', description: 'Vegetable Upma with carrots, peas & roasted cashews', carbs: 38, photo: idliUri, note: 'Semolina with mild spices' },
    { meal_type: 'Breakfast', description: 'Besan Chilla stuffed with crumbled paneer & herbs', carbs: 24, photo: null, note: 'Gram flour pancake with light tea' },
  ];

  const lunchTemplates = [
    { meal_type: 'Lunch', description: '2 Phulka rotis with Palak Paneer, yellow Moong Dal & cucumber salad', carbs: 48, photo: thaliUri, note: 'Balanced Indian thali, minimal ghee' },
    { meal_type: 'Lunch', description: 'Brown rice with Rajma masala & fresh onion tomato kachumber', carbs: 54, photo: null, note: 'Kidney beans curry with fiber-rich brown rice' },
    { meal_type: 'Lunch', description: '2 Multigrain Rotis with homestyle Bhindi fry & Dal Tadka', carbs: 44, photo: thaliUri, note: 'Okra stir fry with cumin & coriander' },
    { meal_type: 'Lunch', description: '2 Rotis with Lauki Chana Dal sabzi & a bowl of fresh curd', carbs: 40, photo: null, note: 'Bottle gourd with split bengal gram' },
    { meal_type: 'Lunch', description: '2 Phulkas with Baingan Bharta, Masoor Dal & cold spiced Chaas', carbs: 42, photo: thaliUri, note: 'Roasted eggplant with herbs & buttermilk' },
    { meal_type: 'Lunch', description: 'Paneer Bhurji with 2 whole wheat rotis & sliced radishes', carbs: 36, photo: null, note: 'Scrambled paneer with tomatoes & ginger' },
  ];

  const dinnerTemplates = [
    { meal_type: 'Dinner', description: 'Yellow Moong Dal Khichdi with fresh curd & roasted papad', carbs: 46, photo: khichdiUri, note: 'Light digestible comfort meal' },
    { meal_type: 'Dinner', description: 'Vegetable Daliya with steamed beans, carrots & coriander', carbs: 34, photo: khichdiUri, note: 'Broken wheat porridge, low glycemic index' },
    { meal_type: 'Dinner', description: 'Grilled Paneer Tikka with bell peppers & green salad', carbs: 16, photo: null, note: 'Low carb high protein dinner' },
    { meal_type: 'Dinner', description: '2 Missi Rotis with Tinda sabzi & fresh sprouted salad', carbs: 35, photo: null, note: 'Gram flour & whole wheat flatbread' },
    { meal_type: 'Dinner', description: 'Mixed vegetable clear soup with 1 multigrain roti & Palak sabzi', carbs: 28, photo: khichdiUri, note: 'Early light dinner' },
  ];

  const snackTemplates = [
    { meal_type: 'Snack', description: 'Roasted Makhana (foxnuts) with pinch of rock salt & black pepper', carbs: 14, photo: null, note: 'Evening tea snack' },
    { meal_type: 'Snack', description: 'Sprouted Moong & Chana chaat with lemon juice & chaat masala', carbs: 18, photo: null, note: 'Protein boost' },
    { meal_type: 'Snack', description: 'Roasted Chana with green tea', carbs: 15, photo: null, note: '4 PM snack' },
  ];

  // Glucose profiles: Fasting 82-105, Pre-Lunch 95-120, Post-Lunch 125-165, Bedtime 105-128
  const baseFasting = [88, 94, 91, 102, 86, 95, 89, 98, 105, 92, 87, 96, 90, 101, 85, 93, 89, 97, 106, 88, 92, 95, 87, 91, 93];
  const basePreLunch = [102, 110, 98, 115, 105, 108, 100, 114, 118, 104, 99, 107, 112, 101, 97, 106, 111, 103, 109, 116, 100, 105, 108, 102, 106];
  const basePostLunch = [135, 148, 130, 162, 142, 146, 134, 155, 168, 132, 126, 145, 159, 136, 128, 149, 154, 137, 143, 172, 133, 140, 147, 131, 138];
  const baseBedtime = [112, 118, 109, 124, 116, 122, 111, 119, 127, 115, 108, 121, 126, 113, 107, 118, 123, 112, 117, 129, 110, 116, 120, 109, 114];

  let mealsCount = 0;
  let readingsCount = 0;

  // Seed backwards from day 24 to day 0 (today)
  for (let dayOffset = 24; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const datePrefix = `${y}-${m}-${d}`;

    const idx = 24 - dayOffset;

    // 1. FASTING READING (07:45 AM)
    const fastingVal = baseFasting[idx % baseFasting.length];
    const fastTime = `${datePrefix}T07:45:00`;
    await safeRun(
      db,
      `INSERT INTO readings (id, value, unit, recordedAt, context, notes, medicine_status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `seed_fast_${dayOffset}`,
        fastingVal,
        'mg/dL',
        fastTime,
        'fasting',
        'Morning fasting reading | Med: Metformin 500mg',
        'taken',
        fastTime,
        fastTime,
      ]
    );
    readingsCount++;

    // 2. BREAKFAST MEAL (08:30 AM)
    const bTemplate = breakfastTemplates[idx % breakfastTemplates.length];
    const bTime = `${datePrefix}T08:30:00`;
    await safeRun(
      db,
      `INSERT INTO meals (id, recordedAt, description, photoPath, photo_uri, carbs, meal_type, note, therapyNotes, analysisStatus, createdAt, updatedAt, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `seed_meal_b_${dayOffset}`,
        bTime,
        bTemplate.description,
        bTemplate.photo,
        bTemplate.photo,
        bTemplate.carbs,
        bTemplate.meal_type,
        bTemplate.note,
        bTemplate.note,
        'manual',
        bTime,
        bTime,
        bTime,
      ]
    );
    mealsCount++;

    // 3. PRE-LUNCH READING (12:45 PM)
    const preVal = basePreLunch[idx % basePreLunch.length];
    const preTime = `${datePrefix}T12:45:00`;
    await safeRun(
      db,
      `INSERT INTO readings (id, value, unit, recordedAt, context, notes, medicine_status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `seed_pre_${dayOffset}`,
        preVal,
        'mg/dL',
        preTime,
        'before_meal',
        'Before lunch',
        'prefer_not_to_say',
        preTime,
        preTime,
      ]
    );
    readingsCount++;

    // 4. LUNCH MEAL (01:15 PM)
    const lTemplate = lunchTemplates[idx % lunchTemplates.length];
    const lTime = `${datePrefix}T01:15:00`;
    await safeRun(
      db,
      `INSERT INTO meals (id, recordedAt, description, photoPath, photo_uri, carbs, meal_type, note, therapyNotes, analysisStatus, createdAt, updatedAt, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `seed_meal_l_${dayOffset}`,
        lTime,
        lTemplate.description,
        lTemplate.photo,
        lTemplate.photo,
        lTemplate.carbs,
        lTemplate.meal_type,
        lTemplate.note,
        lTemplate.note,
        'manual',
        lTime,
        lTime,
        lTime,
      ]
    );
    mealsCount++;

    // 5. POST-LUNCH READING (03:15 PM)
    const postVal = basePostLunch[idx % basePostLunch.length];
    const postTime = `${datePrefix}T15:15:00`;
    await safeRun(
      db,
      `INSERT INTO readings (id, value, unit, recordedAt, context, notes, medicine_status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `seed_post_${dayOffset}`,
        postVal,
        'mg/dL',
        postTime,
        'after_meal',
        '2 hrs post lunch check',
        'not_taken',
        postTime,
        postTime,
      ]
    );
    readingsCount++;

    // 6. AFTERNOON SNACK (every 2nd day at 04:45 PM)
    if (dayOffset % 2 === 0) {
      const sTemplate = snackTemplates[(idx / 2) % snackTemplates.length];
      const sTime = `${datePrefix}T16:45:00`;
      await safeRun(
        db,
        `INSERT INTO meals (id, recordedAt, description, photoPath, photo_uri, carbs, meal_type, note, therapyNotes, analysisStatus, createdAt, updatedAt, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `seed_meal_s_${dayOffset}`,
          sTime,
          sTemplate.description,
          null,
          null,
          sTemplate.carbs,
          sTemplate.meal_type,
          sTemplate.note,
          sTemplate.note,
          'manual',
          sTime,
          sTime,
          sTime,
        ]
      );
      mealsCount++;
    }

    // 7. DINNER MEAL (08:15 PM)
    const dTemplate = dinnerTemplates[idx % dinnerTemplates.length];
    const dTime = `${datePrefix}T20:15:00`;
    await safeRun(
      db,
      `INSERT INTO meals (id, recordedAt, description, photoPath, photo_uri, carbs, meal_type, note, therapyNotes, analysisStatus, createdAt, updatedAt, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `seed_meal_d_${dayOffset}`,
        dTime,
        dTemplate.description,
        dTemplate.photo,
        dTemplate.photo,
        dTemplate.carbs,
        dTemplate.meal_type,
        dTemplate.note,
        dTemplate.note,
        'manual',
        dTime,
        dTime,
        dTime,
      ]
    );
    mealsCount++;

    // 8. BEDTIME READING (10:15 PM)
    const bedVal = baseBedtime[idx % baseBedtime.length];
    const bedTime = `${datePrefix}T22:15:00`;
    await safeRun(
      db,
      `INSERT INTO readings (id, value, unit, recordedAt, context, notes, medicine_status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `seed_bed_${dayOffset}`,
        bedVal,
        'mg/dL',
        bedTime,
        'bedtime',
        'Bedtime check | Med: Metformin 500mg',
        'taken',
        bedTime,
        bedTime,
      ]
    );
    readingsCount++;
  }

  return { seeded: true, days: 25, readingsCount, mealsCount };
}
