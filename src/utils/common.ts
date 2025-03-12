// utils/common.ts
import { TFile, App } from 'obsidian';
import { moment } from 'obsidian';

/**
 * Formats a date according to the specified format
 * @param date - The date to format (string or Date object)
 * @param format - The format string (Moment.js format)
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, format: string): string {
    return moment(date).format(format);
}

/**
 * Refreshes the UI by triggering a file-open event
 * @param app - The Obsidian app instance
 * @param file - The file to refresh
 * @param delay - Optional delay in milliseconds (default: 50)
 */
export function refreshUI(app: App, file: TFile, delay: number = 50): void {
    setTimeout(() => {
        app.workspace.trigger('file-open', file);
    }, delay);
}

/**
 * Gets the current timestamp in the specified format
 * @param format - Optional format string (default: ISO format)
 * @returns Formatted timestamp
 */
export function getCurrentTimestamp(format?: string): string {
    return format ? moment().format(format) : moment().format();
}