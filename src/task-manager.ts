// task-manager.ts
import { App, Notice, TFile } from 'obsidian';
import { moment } from 'obsidian';
import { RecurrenceInfo, calculateNextDueDate, getMissedRecurrences, parseRecurrence } from './recurrence-parser';
import { isNoteATask } from './utils/frontmatter-helper';
import { addCompletionRecord } from './utils/completion-records';
import { RecurringTasksSettings } from './settings';
import { MissedRecurrencesModal } from './ui/missed-recurrences-modal';

/**
 * Manages task operations including checking task status, completing recurrences,
 * and updating frontmatter properties.
 */
export class TaskManager {
    app: App;
    settings: RecurringTasksSettings;
    
    constructor(app: App, settings: RecurringTasksSettings) {
        this.app = app;
        this.settings = settings;
    }
    
    /**
     * Checks if a file is a task with recurrence information
     * @param file - The file to check
     * @returns Object containing task status information
     * @throws Error if file operations fail
     */
    async isTaskWithRecurrence(file: TFile): Promise<{ isTask: boolean, recurrence: RecurrenceInfo | null, isDone: boolean }> {
        try {
            if (!file || file.extension !== 'md') {
                return { isTask: false, recurrence: null, isDone: false };
            }
            
            // Use Obsidian's metadataCache to get frontmatter
            const metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata || !metadata.frontmatter) {
                return { isTask: false, recurrence: null, isDone: false };
            }
            
            const frontmatter = metadata.frontmatter;
            
            // Check if it's a task using the simplified method
            const isTask = isNoteATask(
                frontmatter, 
                this.settings.taskTypeProperty, 
                this.settings.taskTypeValue
            );
            
            if (!isTask) {
                return { isTask: false, recurrence: null, isDone: false };
            }
            
            // Check if it has a recurrence
            const recurProperty = this.settings.recurProperty;
            const recurrenceString = frontmatter[recurProperty];
            const recurrence = parseRecurrence(recurrenceString);
            
            // Check if the task is done
            const doneProperty = this.settings.doneProperty;
            const isDone = frontmatter[doneProperty] === true;
            
            return { isTask, recurrence, isDone };
        } catch (error) {
            console.error("Error checking task status:", error);
            throw new Error(`Failed to check task status: ${error.message}`);
        }
    }
    
    /**
     * Completes a recurrence for a task
     * @param file - The task file
     * @param recurrence - The recurrence information
     * @throws Error if completion fails
     */
    async completeRecurrence(file: TFile, recurrence: RecurrenceInfo) {
        try {
            // Get the frontmatter
            const metadata = this.app.metadataCache.getFileCache(file);
            
            if (!metadata || !metadata.frontmatter) {
                throw new Error('No frontmatter found for this task.');
            }
            
            const frontmatter = metadata.frontmatter;
            const dueProperty = this.settings.dueProperty;
            const currentDue = frontmatter[dueProperty];
            
            if (!currentDue) {
                throw new Error('No due date found for this task.');
            }
            
            const now = moment().format();
            const missedDates = getMissedRecurrences(currentDue, recurrence);
            
            if (missedDates.length > 1) {
                // There are missed recurrences, show a modal
                new MissedRecurrencesModal(this.app, missedDates, async (action) => {
                    try {
                        await this.handleMissedRecurrences(file, action, missedDates, now, currentDue, recurrence);
                    } catch (error) {
                        console.error("Error handling missed recurrences:", error);
                        new Notice(`Failed to handle missed recurrences: ${error.message}`);
                    }
                }).open();
            } else {
                // No missed recurrences, just complete the current one
                await this.completeCurrentRecurrence(file, now, currentDue, recurrence);
            }
        } catch (error) {
            console.error("Error completing recurrence:", error);
            new Notice(`Failed to complete recurrence: ${error.message}`);
            throw error; // Re-throw to allow calling code to handle it
        }
    }
    
    /**
     * Handles missed recurrences for a task
     * @param file - The task file
     * @param action - The action to take ('complete' or 'skip')
     * @param missedDates - Array of missed due dates
     * @param now - Current timestamp
     * @param currentDue - Current due date
     * @param recurrence - Recurrence information
     * @throws Error if handling missed recurrences fails
     */
    private async handleMissedRecurrences(
        file: TFile, 
        action: string, 
        missedDates: string[], 
        now: string, 
        currentDue: string, 
        recurrence: RecurrenceInfo
    ) {
        try {
            // Calculate the next due date
            const nextDue = calculateNextDueDate(currentDue, now, recurrence);
            
            // Update the frontmatter with the new due date using Obsidian's API
            await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
                frontmatter[this.settings.dueProperty] = nextDue;
            });
            
            // Get the current content to add completion records
            const content = await this.app.vault.read(file);
            
            // Add completion records for missed dates
            const status = action === 'complete' ? 'completed' : 'skipped';
            let updatedContent = content;
            
            for (const missedDate of missedDates) {
                updatedContent = addCompletionRecord(
                    updatedContent, 
                    missedDate, 
                    status, 
                    this.settings.completionHeading, 
                    this.settings.completionPosition,
                    this.settings.dateTimeFormat,
                    this.settings.completedIndicator,
                    this.settings.skippedIndicator
                );
            }
            
            // Save the updated content with completion records
            if (updatedContent !== content) {
                await this.app.vault.modify(file, updatedContent);
            }
            
            new Notice(`Updated due date and added ${missedDates.length} ${status} records.`);
        } catch (error) {
            console.error("Error handling missed recurrences:", error);
            new Notice(`Failed to handle missed recurrences: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Completes the current recurrence for a task
     * @param file - The task file
     * @param completionTime - Timestamp of completion
     * @param currentDue - Current due date
     * @param recurrence - Recurrence information
     * @throws Error if completing current recurrence fails
     */
    private async completeCurrentRecurrence(
        file: TFile, 
        completionTime: string, 
        currentDue: string, 
        recurrence: RecurrenceInfo
    ) {
        try {
            // Calculate the next due date
            const nextDue = calculateNextDueDate(currentDue, completionTime, recurrence);
            
            // Update the frontmatter with the new due date using Obsidian's API
            await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
                frontmatter[this.settings.dueProperty] = nextDue;
            });
            
            // Get the current content to add completion record
            const content = await this.app.vault.read(file);
            
            // Add a completion record
            const updatedContent = addCompletionRecord(
                content, 
                completionTime, 
                'completed', 
                this.settings.completionHeading, 
                this.settings.completionPosition,
                this.settings.dateTimeFormat,
                this.settings.completedIndicator,
                this.settings.skippedIndicator
            );
            
            // Save the updated content with completion record
            if (updatedContent !== content) {
                await this.app.vault.modify(file, updatedContent);
            }
            
            new Notice('Task completed and due date updated.');
        } catch (error) {
            console.error("Error completing current recurrence:", error);
            new Notice(`Failed to complete current recurrence: ${error.message}`);
            throw error;
        }
    }

    /**
     * Updates the CompleteTime field based on the Done status
     * @param file - The file to update
     * @returns Promise that resolves to true if an update was made, false otherwise
     * @throws Error if updating CompleteTime field fails
     */
    async updateCompleteTimeField(file: TFile): Promise<boolean> {
        try {
            // Get the frontmatter
            const metadata = this.app.metadataCache.getFileCache(file);
            
            if (!metadata || !metadata.frontmatter) {
                return false;
            }
            
            const frontmatter = metadata.frontmatter;
            const doneProperty = this.settings.doneProperty;
            const completeTimeProperty = this.settings.completeTimeProperty;
            
            // Check if it's a task
            const isTask = isNoteATask(
                frontmatter, 
                this.settings.taskTypeProperty, 
                this.settings.taskTypeValue
            );
            
            if (!isTask) {
                return false;
            }
            
            // Get the current done status
            const isDone = frontmatter[doneProperty] === true;
            const currentCompleteTime = frontmatter[completeTimeProperty];
            
            // Determine if we need to update
            let shouldUpdate = false;
            
            if (isDone && !currentCompleteTime) {
                // Done is true but CompleteTime is empty - set it
                shouldUpdate = true;
            } else if (!isDone && currentCompleteTime) {
                // Done is false but CompleteTime has a value - clear it
                shouldUpdate = true;
            }
            
            if (shouldUpdate) {
                // Update the frontmatter using Obsidian's API
                await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
                    if (isDone) {
                        // Set CompleteTime to current time
                        frontmatter[completeTimeProperty] = moment().format();
                    } else {
                        // Set CompleteTime to empty string instead of removing it
                        frontmatter[completeTimeProperty] = '';
                    }
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error("Error updating CompleteTime field:", error);
            // Don't show a notice here as this happens in the background
            // But still throw for upstream handlers
            throw new Error(`Failed to update CompleteTime field: ${error.message}`);
        }
    }
}