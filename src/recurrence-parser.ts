// recurrence-parser.ts
import { moment } from "obsidian";

export interface RecurrenceInfo {
    amount: number;
    unit: 'day' | 'week' | 'month' | 'year';
    mode: 'after_due' | 'after_completion';
}

export function parseRecurrence(recurrenceString: string): RecurrenceInfo | null {
    if (!recurrenceString) return null;
    
    // Normalize the string: trim whitespace, convert to lowercase
    const normalized = recurrenceString.trim().toLowerCase();
    
    // Try to match both shorthand and longform patterns
    const shorthandRegex = /^(\d+)\s*(d|w|m|y)(c)?$/;
    const longformRegex = /^(\d+)\s*(day|days|week|weeks|month|months|year|years)(\s+after\s+completion)?$/;
    
    let match = shorthandRegex.exec(normalized);
    if (match) {
        const amount = parseInt(match[1], 10);
        let unit: 'day' | 'week' | 'month' | 'year';
        
        switch (match[2]) {
            case 'd': unit = 'day'; break;
            case 'w': unit = 'week'; break;
            case 'm': unit = 'month'; break;
            case 'y': unit = 'year'; break;
            default: return null; // Should never happen due to regex
        }
        
        const mode = match[3] ? 'after_completion' : 'after_due';
        
        return { amount, unit, mode };
    }
    
    match = longformRegex.exec(normalized);
    if (match) {
        const amount = parseInt(match[1], 10);
        let unit: 'day' | 'week' | 'month' | 'year';
        
        if (match[2].startsWith('day')) unit = 'day';
        else if (match[2].startsWith('week')) unit = 'week';
        else if (match[2].startsWith('month')) unit = 'month';
        else if (match[2].startsWith('year')) unit = 'year';
        else return null; // Should never happen due to regex
        
        const mode = match[3] ? 'after_completion' : 'after_due';
        
        return { amount, unit, mode };
    }
    
    return null; // No match found
}

export function calculateNextDueDate(
    currentDue: string, 
    completionTime: string, 
    recurrence: RecurrenceInfo
): string {
    // Parse the dates
    const currentDueMoment = moment(currentDue);
    const completionMoment = moment(completionTime);
    
    // Determine the base date to start from
    const baseMoment = recurrence.mode === 'after_completion' 
        ? completionMoment 
        : currentDueMoment;
    
    // Clone the moment to avoid modifying the original
    let nextDueMoment = baseMoment.clone();
    
    // Add the recurrence interval
    switch (recurrence.unit) {
        case 'day':
            nextDueMoment.add(recurrence.amount, 'days');
            break;
        case 'week':
            nextDueMoment.add(recurrence.amount, 'weeks');
            break;
        case 'month':
            nextDueMoment.add(recurrence.amount, 'months');
            break;
        case 'year':
            nextDueMoment.add(recurrence.amount, 'years');
            break;
    }
    
    // For "after due" mode, if the next due date is in the past,
    // keep adding recurrence intervals until it's in the future
    if (recurrence.mode === 'after_due') {
        const now = moment();
        while (nextDueMoment.isBefore(now)) {
            switch (recurrence.unit) {
                case 'day':
                    nextDueMoment.add(recurrence.amount, 'days');
                    break;
                case 'week':
                    nextDueMoment.add(recurrence.amount, 'weeks');
                    break;
                case 'month':
                    nextDueMoment.add(recurrence.amount, 'months');
                    break;
                case 'year':
                    nextDueMoment.add(recurrence.amount, 'years');
                    break;
            }
        }
    }
    
    // Return the formatted date string
    return nextDueMoment.format();
}

export function getMissedRecurrences(
    currentDue: string,
    recurrence: RecurrenceInfo
): string[] {
    if (recurrence.mode !== 'after_due') {
        return []; // No missed recurrences for "after completion" mode
    }
    
    const currentDueMoment = moment(currentDue);
    const now = moment();
    
    // If the due date is in the future, there are no missed recurrences
    if (currentDueMoment.isAfter(now)) {
        return [];
    }
    
    const missedDates: string[] = [];
    let dateMoment = currentDueMoment.clone();
    
    // Add the current due date if it's in the past
    missedDates.push(dateMoment.format());
    
    // Keep adding recurrence intervals until we reach the present
    while (true) {
        switch (recurrence.unit) {
            case 'day':
                dateMoment.add(recurrence.amount, 'days');
                break;
            case 'week':
                dateMoment.add(recurrence.amount, 'weeks');
                break;
            case 'month':
                dateMoment.add(recurrence.amount, 'months');
                break;
            case 'year':
                dateMoment.add(recurrence.amount, 'years');
                break;
        }
        
        // If we've reached the present or future, stop
        if (dateMoment.isAfter(now)) {
            break;
        }
        
        missedDates.push(dateMoment.format());
    }
    
    return missedDates;
}