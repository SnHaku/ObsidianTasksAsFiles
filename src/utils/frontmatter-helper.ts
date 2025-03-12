// utils/frontmatter-helper.ts
import { App, TFile, moment } from 'obsidian';
import { RecurringTasksSettings } from '../settings';

/**
 * Checks if a note is a task based on its frontmatter
 * @param frontmatter - The frontmatter object
 * @param taskTypeProperty - The property name that identifies tasks
 * @param taskTypeValue - The value that identifies tasks
 * @returns Boolean indicating if the note is a task
 */
export function isNoteATask(frontmatter: any, taskTypeProperty: string, taskTypeValue: string): boolean {
    if (!frontmatter || !taskTypeProperty || !taskTypeValue) return false;
    
    const propertyValue = frontmatter[taskTypeProperty];
    
    if (propertyValue === undefined) return false;
    
    // Case 1: Direct equality for string values
    if (propertyValue === taskTypeValue) return true;
    
    // Case 2: Array includes the value
    if (Array.isArray(propertyValue) && propertyValue.includes(taskTypeValue)) return true;
    
    return false;
}

/**
 * Updates task properties in frontmatter
 * @param app - The Obsidian app instance
 * @param file - The file to update
 * @param updates - Object containing property-value pairs to update
 * @returns Promise that resolves when the update is complete
 */
export async function updateTaskProperties(
    app: App, 
    file: TFile, 
    updates: Record<string, any>
): Promise<void> {
    return app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (frontmatter) {
            Object.entries(updates).forEach(([key, value]) => {
                frontmatter[key] = value;
            });
        }
    });
}

/**
 * Toggles the done status of a task and updates the CompleteTime
 * @param app - The Obsidian app instance
 * @param file - The file to update
 * @param settings - The plugin settings
 * @param currentDoneStatus - The current done status
 * @param timestamp - The timestamp to use (optional, defaults to now)
 * @returns Promise that resolves when the update is complete
 */
export async function toggleTaskDoneStatus(
    app: App,
    file: TFile,
    settings: RecurringTasksSettings,
    currentDoneStatus: boolean,
    timestamp?: string
): Promise<void> {
    const updates: Record<string, any> = {};
    
    // Toggle the done status
    updates[settings.doneProperty] = !currentDoneStatus;
    
    // Update the CompleteTime based on the new done status
    if (!currentDoneStatus) { // It's becoming true
        updates[settings.completeTimeProperty] = timestamp || moment().format();
    } else { // It's becoming false
        updates[settings.completeTimeProperty] = '';
    }
    
    return updateTaskProperties(app, file, updates);
}