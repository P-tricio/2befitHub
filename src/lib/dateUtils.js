import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Safely converts any value to a Date object.
 * Returns null if the value cannot be converted or is an invalid date.
 * Handles:
 * - Date objects
 * - Firebase Timestamps (objects with .toDate() or .toMillis())
 * - Serialized Firestore Timestamps (objects with seconds/nanoseconds)
 * - ISO strings or timestamps
 * - Null/Undefined
 */
export const ensureDate = (val) => {
    if (val === null || val === undefined) return null;

    let date;

    // 1. Already a Date object
    if (val instanceof Date) {
        date = val;
    }
    // 2. Check for Firebase Timestamp or similar with .toDate()
    else if (typeof val.toDate === 'function') {
        date = val.toDate();
    }
    // 3. Check for Firebase Timestamp or similar with .toMillis()
    else if (typeof val.toMillis === 'function') {
        date = new Date(val.toMillis());
    }
    // 4. Handle serialized Firestore Timestamps (objects with seconds/nanoseconds)
    else if (typeof val === 'object' && val.seconds !== undefined) {
        date = new Date(val.seconds * 1000 + (val.nanoseconds ? val.nanoseconds / 1000000 : 0));
    }
    // 5. Try parsing as a timestamp (number) or string
    else {
        date = new Date(val);
    }

    // Final validation
    return (date instanceof Date && !isNaN(date.getTime())) ? date : null;
};

/**
 * Safely formats a date using date-fns format.
 * Prevents "Invalid time value" RangeErrors.
 */
export const formatDateSafe = (dateVal, formatStr, options = { locale: es }) => {
    const date = ensureDate(dateVal);
    if (!date) return '—';
    try {
        return format(date, formatStr, options);
    } catch (e) {
        console.error('Error in formatDateSafe:', e, 'Value:', dateVal, 'Format:', formatStr);
        return '—';
    }
};

/**
 * Safely formats a date using toLocaleDateString.
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

/**
 * Safely formats distance to now.
 */
export const formatDistanceToNowSafe = (dateVal, options = { locale: es }) => {
    const date = ensureDate(dateVal);
    if (!date) return '—';
    try {
        return formatDistanceToNow(date, options);
    } catch (e) {
        console.error('Error in formatDistanceToNowSafe:', e, 'Value:', dateVal);
        return '—';
    }
};
