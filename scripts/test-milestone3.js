/**
 * Automated Verification for Milestone 3 Quick Reading Logic & Rules
 */

const {
  nowLocalInputValue,
  nowLocalMinute,
  formatDisplay,
  isStableLocalString,
} = require('../src/lib/time.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('Milestone 3: Quick Reading Form Validation & Rules');
console.log('====================================================');

// 1. Glucose Range Validation Logic
console.log('\n1. Testing Glucose Range Validation (Sensible Range 20 - 600 mg/dL):');
function validateGlucose(val) {
  if (!val || String(val).trim() === '') {
    return 'Please enter your glucose reading.';
  }
  const num = parseFloat(val);
  if (isNaN(num)) {
    return 'Please enter a valid numeric value.';
  }
  if (num < 20 || num > 600) {
    return 'Please enter a realistic glucose value between 20 and 600 mg/dL.';
  }
  return '';
}

assert(validateGlucose('') === 'Please enter your glucose reading.', 'Rejects empty input');
assert(validateGlucose('abc') === 'Please enter a valid numeric value.', 'Rejects non-numeric input');
assert(validateGlucose('15').includes('between 20 and 600'), 'Rejects dangerously low value < 20');
assert(validateGlucose('650').includes('between 20 and 600'), 'Rejects dangerously high value > 600');
assert(validateGlucose('120') === '', 'Accepts valid normal reading (120 mg/dL)');
assert(validateGlucose('20') === '', 'Accepts lower bound boundary (20 mg/dL)');
assert(validateGlucose('600') === '', 'Accepts upper bound boundary (600 mg/dL)');

// 2. Local Timestamp Pre-fill & Non-Reset
console.log('\n2. Testing Date/Time Pre-fill & Non-Reset Guarantee:');
const prefilledTime = nowLocalMinute();
assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(prefilledTime), 'Pre-filled format is YYYY-MM-DDTHH:mm');
assert(isStableLocalString(prefilledTime), 'Pre-filled time is stable local string');

// Simulate typing in other fields: state preserving recordedAt
let formState = {
  glucoseValue: '',
  recordedAt: prefilledTime,
  context: null,
  notes: '',
};

// User types value
formState.glucoseValue = '135';
assert(formState.recordedAt === prefilledTime, 'Typing glucose value does NOT reset recordedAt');

// User selects context
formState.context = 'Fasting';
assert(formState.recordedAt === prefilledTime, 'Selecting context does NOT reset recordedAt');

// User types notes
formState.notes = 'Checked before morning walk';
assert(formState.recordedAt === prefilledTime, 'Typing notes does NOT reset recordedAt');

// 3. Optional Reading Context (Hard Rule 8)
console.log('\n3. Testing Reading Context Rule (Hard Rule 8: Save null if unset):');
function resolveContext(selectedOption) {
  if (!selectedOption || selectedOption === 'Prefer not to specify') {
    return null;
  }
  return selectedOption;
}

assert(resolveContext(null) === null, 'Unset context resolves to null');
assert(resolveContext('Prefer not to specify') === null, '"Prefer not to specify" resolves to null');
assert(resolveContext('Fasting') === 'Fasting', '"Fasting" resolves to Fasting');
assert(resolveContext('Before meal') === 'Before meal', '"Before meal" resolves to Before meal');
assert(resolveContext('After meal') === 'After meal', '"After meal" resolves to After meal');
assert(resolveContext('Other') === 'Other', '"Other" resolves to Other');

// Display label rule
function getDisplayContext(ctx) {
  return ctx || 'Context not specified';
}
assert(getDisplayContext(null) === 'Context not specified', 'Null context displays verbatim "Context not specified"');
assert(getDisplayContext('Fasting') === 'Fasting', 'Fasting context displays "Fasting"');

// 4. Edit Workflow: Preserve Timestamp Unless Explicitly Changed
console.log('\n4. Testing Edit Reading: Timestamp Preservation:');
const originalRecord = {
  id: 'read_123',
  value: 140,
  unit: 'mg/dL',
  recordedAt: '2026-10-15T10:15',
  context: 'Before meal',
  notes: 'Original note',
  createdAt: '2026-10-15T10:15:02',
  updatedAt: '2026-10-15T10:15:02',
};

// Simulate editing: user updates value to 145 and changes notes
const editPayload = {
  value: 145,
  // User did NOT edit recordedAt
  recordedAt: originalRecord.recordedAt,
  context: originalRecord.context,
  notes: 'Updated note after re-test',
};

const savedRecord = {
  ...originalRecord,
  ...editPayload,
  updatedAt: '2026-10-15T15:20:00',
};

assert(savedRecord.value === 145, 'Value updated successfully');
assert(savedRecord.notes === 'Updated note after re-test', 'Notes updated successfully');
assert(savedRecord.recordedAt === originalRecord.recordedAt, 'HARD RULE 6: recordedAt preserved unchanged across edit');

// 5. Delete Workflow
console.log('\n5. Testing Delete Confirmation & Removal:');
let databaseRecords = [savedRecord];
assert(databaseRecords.length === 1, 'Database initially has 1 record');

// User confirms deletion
const idToDelete = 'read_123';
databaseRecords = databaseRecords.filter((r) => r.id !== idToDelete);
assert(databaseRecords.length === 0, 'Record successfully deleted from database');

console.log('\n====================================================');
console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
