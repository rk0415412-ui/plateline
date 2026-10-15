/**
 * PlateLine Time Utilities
 *
 * HARD RULE 6: Store timestamps as LOCAL date-time strings. No UTC conversion.
 * Proved by stability test: save, reload, edit a non-time field, timestamp unchanged.
 */

/**
 * Returns current local date-time string in 'YYYY-MM-DDTHH:mm:ss' format.
 * Never uses toISOString() to avoid UTC conversion shifts.
 *
 * @param {Date} [d=new Date()]
 * @returns {string} e.g. '2026-10-15T14:35:00'
 */
export function nowLocalInputValue(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Returns 'YYYY-MM-DDTHH:mm' suitable for date-time input fields.
 *
 * @param {Date} [d=new Date()]
 * @returns {string} e.g. '2026-10-15T14:35'
 */
export function nowLocalMinute(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse local date-time string into components without any UTC timezone shift.
 * Supports 'YYYY-MM-DDTHH:mm' and 'YYYY-MM-DDTHH:mm:ss' and 'YYYY-MM-DD HH:mm:ss'.
 *
 * @param {string} localStr
 * @returns {{ year: number, month: number, day: number, hours: number, minutes: number, seconds: number }}
 */
export function parseLocalString(localStr) {
  if (!localStr || typeof localStr !== 'string') {
    throw new Error(`Invalid local date-time string: ${localStr}`);
  }
  const cleanStr = localStr.trim().replace(' ', 'T');
  const [datePart, timePart = '00:00:00'] = cleanStr.split('T');
  const dateParts = datePart.split('-').map(Number);
  const timeParts = timePart.split(':').map(Number);

  const year = dateParts[0];
  const month = dateParts[1];
  const day = dateParts[2];
  const hours = timeParts[0] || 0;
  const minutes = timeParts[1] || 0;
  const seconds = timeParts[2] || 0;

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Malformed date components in: ${localStr}`);
  }

  return { year, month, day, hours, minutes, seconds };
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats a local date-time string into human-readable text.
 * Guaranteed zero UTC shift: string components are extracted directly.
 *
 * @param {string} localDateTimeStr e.g. '2026-10-15T14:30:00'
 * @param {object} [options]
 * @param {boolean} [options.includeDate=true]
 * @param {boolean} [options.includeTime=true]
 * @param {boolean} [options.includeYear=true]
 * @returns {string} e.g. '15 Oct 2026, 2:30 PM'
 */
export function formatDisplay(localDateTimeStr, options = {}) {
  if (!localDateTimeStr) return 'No timestamp';
  const { includeDate = true, includeTime = true, includeYear = true } = options;

  try {
    const { year, month, day, hours, minutes } = parseLocalString(localDateTimeStr);
    const monthName = MONTH_NAMES[month - 1] || `M${month}`;

    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const minStr = String(minutes).padStart(2, '0');
    const timeFormatted = `${hour12}:${minStr} ${ampm}`;

    if (includeDate && includeTime) {
      const yearStr = includeYear ? ` ${year}` : '';
      return `${day} ${monthName}${yearStr}, ${timeFormatted}`;
    }
    if (includeDate) {
      const yearStr = includeYear ? ` ${year}` : '';
      return `${day} ${monthName}${yearStr}`;
    }
    if (includeTime) {
      return timeFormatted;
    }
    return `${day} ${monthName}`;
  } catch (err) {
    return localDateTimeStr;
  }
}

/**
 * Calculates the difference in minutes between two local date-time strings: (b - a).
 * Positive if b occurred after a.
 * Both timestamps are interpreted in local time with no UTC offset skew.
 *
 * @param {string} a Local date-time string (earlier event)
 * @param {string} b Local date-time string (later event)
 * @returns {number} Difference in minutes
 */
export function minutesBetween(a, b) {
  const pA = parseLocalString(a);
  const pB = parseLocalString(b);

  // Construct local timestamps using identical local reference
  const dateA = new Date(pA.year, pA.month - 1, pA.day, pA.hours, pA.minutes, pA.seconds);
  const dateB = new Date(pB.year, pB.month - 1, pB.day, pB.hours, pB.minutes, pB.seconds);

  const diffMs = dateB.getTime() - dateA.getTime();
  return Math.round(diffMs / (1000 * 60));
}

/**
 * Generates neutral proximity wording between a reading and a meal.
 * HARD RULE 4: Never say a meal "caused" a reading.
 * Only: "recorded near", "appeared after", "recorded X min after: [meal]".
 *
 * @param {string} mealTime
 * @param {string} readingTime
 * @param {string} mealDescription
 * @returns {string|null} Neutral proximity string or null if window not met
 */
export function getProximityLabel(mealTime, readingTime, mealDescription) {
  const mins = minutesBetween(mealTime, readingTime);
  // Within prior 4 hours (0 to 240 minutes)
  if (mins >= 0 && mins <= 240) {
    return `Recorded ${mins} min after: ${mealDescription}`;
  }
  return null;
}

/**
 * Validates that a string is a stable, non-shifted local date-time format.
 *
 * @param {string} str
 * @returns {boolean}
 */
export function isStableLocalString(str) {
  if (!str || typeof str !== 'string') return false;
  // Disallow trailing 'Z' or timezone offsets '+00:00' to enforce local-only
  if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
    return false;
  }
  return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/.test(str);
}
