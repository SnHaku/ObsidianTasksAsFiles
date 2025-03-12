// utils/recurrence-utils.ts
import { moment } from "obsidian";
import { RecurrenceInfo } from '../recurrence-parser';

/**
 * Adds a time period to a date based on recurrence info
 * @param date - The base date to add to
 * @param recurrence - The recurrence information
 * @returns A new moment object with the added time
 */
export function addRecurrencePeriod(date: moment.Moment, recurrence: RecurrenceInfo): moment.Moment {
    const result = date.clone();
    
    switch (recurrence.unit) {
        case 'day':
            result.add(recurrence.amount, 'days');
            break;
        case 'week':
            result.add(recurrence.amount, 'weeks');
            break;
        case 'month':
            result.add(recurrence.amount, 'months');
            break;
        case 'year':
            result.add(recurrence.amount, 'years');
            break;
    }
    
    return result;
}

/**
 * Ensures a date is in the future by adding recurrence periods if needed
 * @param date - The date to check
 * @param recurrence - The recurrence information
 * @returns A moment object that is guaranteed to be in the future
 */
export function ensureFutureDate(date: moment.Moment, recurrence: RecurrenceInfo): moment.Moment {
    const now = moment();
    let result = date.clone();
    
    while (result.isBefore(now)) {
        result = addRecurrencePeriod(result, recurrence);
    }
    
    return result;
}