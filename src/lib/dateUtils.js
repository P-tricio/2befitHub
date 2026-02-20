/**
 * Safely converts any value to a Date object.
 * Returns null if the value cannot be converted or is an invalid date.
 * Handles:
 * - Date objects
 * - Firebase Timestamps (objects with .toDate() or .toMillis())
 * - ISO strings or timestamps
 * - Null/Undefined
 */
export const ensureDate = (val) => {
    if (val === null || val === undefined) return null;

    let date;

    // 1. Check for Firebase Timestamp or similar with .toDate()
    if (typeof val.toDate === 'function') {
        date = val.toDate();
    }
    // 2. Check for Firebase Timestamp or similar with .toMillis()
    else if (typeof val.toMillis === 'function') {
        date = new Date(val.toMillis());
    }
    // 3. Already a Date object
    else if (val instanceof Date) {
        date = val;
    }
    // 4. Try parsing as a timestamp (number) or string
    else {
        date = new Date(val);
    }

    // Final validation
    return (date instanceof Date && !isNaN(date.getTime())) ? date : null;
};

/**
 * Safely formats a date using toLocaleDateString.
 * Prevents "Invalid time value" RangeErrors.
 */
export const formatDateSafely = (val, options = {}, locale = 'es-ES') => {
    const date = ensureDate(val);
    if (!date) return '—';
    try {
        return date.toLocaleDateString(locale, options);
    } catch (e) {
        console.error('Error in formatDateSafely:', e, 'Value:', val);
        return '—';
    }
};
