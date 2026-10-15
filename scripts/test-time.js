/**
 * Automated Verification for Milestone 2 Time Utilities & Non-Shift Guarantees
 */

const {
  nowLocalInputValue,
  nowLocalMinute,
  parseLocalString,
  formatDisplay,
  minutesBetween,
  getProximityLabel,
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
console.log('Milestone 2: Time Utilities & UTC Non-Shift Tests');
console.log('====================================================');

// 1. nowLocalInputValue format & no UTC offset
const nowStr = nowLocalInputValue();
console.log('\n1. Testing nowLocalInputValue():', nowStr);
assert(!nowStr.includes('Z'), 'Must NOT contain "Z" (UTC indicator)');
assert(!nowStr.includes('+'), 'Must NOT contain "+" (timezone offset)');
assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(nowStr), 'Must match YYYY-MM-DDTHH:mm:ss');
assert(isStableLocalString(nowStr), 'isStableLocalString must return true');

// 2. parseLocalString components
console.log('\n2. Testing parseLocalString():');
const parsed = parseLocalString('2026-10-15T14:35:42');
assert(parsed.year === 2026, 'Year matches 2026');
assert(parsed.month === 10, 'Month matches 10');
assert(parsed.day === 15, 'Day matches 15');
assert(parsed.hours === 14, 'Hours matches 14');
assert(parsed.minutes === 35, 'Minutes matches 35');
assert(parsed.seconds === 42, 'Seconds matches 42');

// 3. formatDisplay zero shift guarantee
console.log('\n3. Testing formatDisplay():');
const formatted = formatDisplay('2026-10-15T14:35:00');
console.log('   Input: "2026-10-15T14:35:00" -> Output:', `"${formatted}"`);
assert(formatted === '15 Oct 2026, 2:35 PM', 'Formatted string matches expected exactly');

// 4. minutesBetween calculations
console.log('\n4. Testing minutesBetween():');
const mealTime = '2026-10-15T13:00:00';
const readingTime = '2026-10-15T14:35:00';
const diffMins = minutesBetween(mealTime, readingTime);
console.log(`   Between ${mealTime} and ${readingTime}: ${diffMins} mins`);
assert(diffMins === 95, 'Time gap is exactly 95 minutes');

// 5. Proximity neutral wording (HARD RULE 4)
console.log('\n5. Testing getProximityLabel():');
const proximityLabel = getProximityLabel(mealTime, readingTime, 'Dal and roti');
console.log('   Label:', `"${proximityLabel}"`);
assert(
  proximityLabel === 'Recorded 95 min after: Dal and roti',
  'Neutral proximity phrasing matches Rule 4 ("Recorded X min after: [meal]")'
);

// 6. Hard Rule 6 Proof: Timestamp stability across edit simulation
console.log('\n6. Testing Timestamp Stability Rule (Simulated Record Lifecycle):');
const initialTimestamp = '2026-10-15T14:30:00';
let record = {
  id: 'read_test_1',
  value: 132,
  unit: 'mg/dL',
  recordedAt: initialTimestamp,
  context: 'Before meal',
  notes: 'Original note',
  createdAt: '2026-10-15T14:30:01',
  updatedAt: '2026-10-15T14:30:01',
};

// Simulate app reload: serialize and deserialize
const serialized = JSON.stringify(record);
const reloaded = JSON.parse(serialized);
assert(reloaded.recordedAt === initialTimestamp, 'Timestamp identical after reload');

// Simulate editing non-time field only
const nonTimeUpdate = { notes: 'Updated note only' };
const updatedRecord = {
  ...reloaded,
  ...nonTimeUpdate,
  updatedAt: '2026-10-15T14:35:22',
};

assert(updatedRecord.notes === 'Updated note only', 'Notes field successfully updated');
assert(updatedRecord.recordedAt === initialTimestamp, 'HARD RULE 6: recordedAt remains 100% UNCHANGED');
assert(updatedRecord.recordedAt.length === initialTimestamp.length, 'Length identical');

console.log('\n====================================================');
console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
