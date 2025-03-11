import { moment } from "obsidian";

// Recurrence types
export enum RecurrenceType {
    FIXED_INTERVAL, // Based on original due date
    AFTER_COMPLETION // Based on completion date
}

// Recurrence interval units
export enum IntervalUnit {
    DAY,
    WEEK,
    MONTH,
    YEAR
}

// Structure to represent a recurrence pattern
export interface RecurrencePattern {
    type: RecurrenceType;
    interval: number;
    unit: IntervalUnit;
}

/**
 * Parse a recurrence string into a RecurrencePattern object
 * Supports formats:
 * - "every 2 weeks" or "2w" (weeks)
 * - "every 1 month after completion" or "1mc" (months after completion)
 * - "3d" (days)
 * - "1y" (years)
 */
export function parseRecurrencePattern(recurrenceString: string): RecurrencePattern | null {
    if (!recurrenceString) return null;
    
    // Convert to lowercase for easier parsing
    const str = recurrenceString.toLowerCase().trim();
    
    // Check for shorthand notation first (e.g., "2w", "1mc")
    const shorthandRegex = /^(\d+)([dwmy])(c)?$/i;
    const shorthandMatch = str.match(shorthandRegex);
    
    if (shorthandMatch) {
        const interval = parseInt(shorthandMatch[1]);
        const unitChar = shorthandMatch[2].toLowerCase();
        const isAfterCompletion = !!shorthandMatch[3]; // Check if 'c' suffix exists
        
        let unit: IntervalUnit;
        switch (unitChar) {
            case 'd': unit = IntervalUnit.DAY; break;
            case 'w': unit = IntervalUnit.WEEK; break;
            case 'm': unit = IntervalUnit.MONTH; break;
            case 'y': unit = IntervalUnit.YEAR; break;
            default: return null;
        }
        
        return {
            type: isAfterCompletion ? RecurrenceType.AFTER_COMPLETION : RecurrenceType.FIXED_INTERVAL,
            interval,
            unit
        };
    }
    
    // If not shorthand, try the verbose format
    // Default to fixed interval if not specified
    let type = RecurrenceType.FIXED_INTERVAL;
    if (str.includes("after completion")) {
        type = RecurrenceType.AFTER_COMPLETION;
    }
    
    // Extract interval and unit, with or without "every" prefix
    // This regex will match patterns like "every 1 day", "1 day", "2 weeks", etc.
    const matches = str.match(/(?:every\s+)?(\d+)\s+(day|days|week|weeks|month|months|year|years)/i);
    if (!matches || matches.length < 3) return null;
    
    const interval = parseInt(matches[1]);
    let unit: IntervalUnit;
    
    // Determine the interval unit
    if (matches[2].startsWith("day")) {
        unit = IntervalUnit.DAY;
    } else if (matches[2].startsWith("week")) {
        unit = IntervalUnit.WEEK;
    } else if (matches[2].startsWith("month")) {
        unit = IntervalUnit.MONTH;
    } else if (matches[2].startsWith("year")) {
        unit = IntervalUnit.YEAR;
    } else {
        return null;
    }
    
    return { type, interval, unit };
}

/**
 * Calculate the next occurrence date based on the recurrence pattern
 * @param pattern The recurrence pattern
 * @param lastDueDate The previous due date
 * @param completionDate The date when the task was completed (only used for AFTER_COMPLETION type)
 * @returns The next occurrence date
 */
export function calculateNextOccurrence(
    pattern: RecurrencePattern,
    lastDueDate: moment.Moment,
    completionDate?: moment.Moment
): moment.Moment {
    // Use the appropriate base date depending on recurrence type
    const baseDate = pattern.type === RecurrenceType.AFTER_COMPLETION && completionDate
        ? completionDate.clone()
        : lastDueDate.clone();
    
    // Calculate the next date based on the interval unit
    let nextDate: moment.Moment;
    
    switch (pattern.unit) {
        case IntervalUnit.DAY:
            nextDate = baseDate.add(pattern.interval, 'days');
            break;
        case IntervalUnit.WEEK:
            nextDate = baseDate.add(pattern.interval, 'weeks');
            break;
        case IntervalUnit.MONTH:
            nextDate = baseDate.add(pattern.interval, 'months');
            break;
        case IntervalUnit.YEAR:
            nextDate = baseDate.add(pattern.interval, 'years');
            break;
    }
    
    // Ensure the next date is in the future
    const now = moment();
    while (nextDate.isSameOrBefore(now, 'day')) {
        switch (pattern.unit) {
            case IntervalUnit.DAY:
                nextDate.add(pattern.interval, 'days');
                break;
            case IntervalUnit.WEEK:
                nextDate.add(pattern.interval, 'weeks');
                break;
            case IntervalUnit.MONTH:
                nextDate.add(pattern.interval, 'months');
                break;
            case IntervalUnit.YEAR:
                nextDate.add(pattern.interval, 'years');
                break;
        }
    }
    
    return nextDate;
}