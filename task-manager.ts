// task-manager.ts
import { App, Notice, TFile } from 'obsidian';
import { moment } from 'obsidian';
import { RecurrenceInfo, calculateNextDueDate, getMissedRecurrences, parseRecurrence } from './recurrence-parser';
import { addCompletionRecord, isNoteATask } from './utils';
import { RecurringTasksSettings } from './settings';
import { MissedRecurrencesModal } from './ui/missed-recurrences-modal';

export class TaskManager {
    app: App;
    settings: RecurringTasksSettings;
    
    constructor(app: App, settings: RecurringTasksSettings) {
        this.app = app;
        this.settings = settings;
    }
    
    async isTaskWithRecurrence(file: TFile): Promise<{ isTask: boolean, recurrence: RecurrenceInfo | null, isDone: boolean }> {
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
    }
    
    async completeRecurrence(file: TFile, recurrence: RecurrenceInfo) {
        // Get the frontmatter
        const metadata = this.app.metadataCache.getFileCache(file);
        
        if (!metadata || !metadata.frontmatter) {
            new Notice('No frontmatter found for this task.');
            return;
        }
        
        const frontmatter = metadata.frontmatter;
        const dueProperty = this.settings.dueProperty;
        const currentDue = frontmatter[dueProperty];
        
        if (!currentDue) {
            new Notice('No due date found for this task.');
            return;
        }
        
        const now = moment().format();
        const missedDates = getMissedRecurrences(currentDue, recurrence);
        
        if (missedDates.length > 1) {
            // There are missed recurrences, show a modal
            new MissedRecurrencesModal(this.app, missedDates, async (action) => {
                await this.handleMissedRecurrences(file, action, missedDates, now, currentDue, recurrence);
            }).open();
        } else {
            // No missed recurrences, just complete the current one
            await this.completeCurrentRecurrence(file, now, currentDue, recurrence);
        }
    }
    
    private async handleMissedRecurrences(
        file: TFile, 
        action: string, 
        missedDates: string[], 
        now: string, 
        currentDue: string, 
        recurrence: RecurrenceInfo
    ) {
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
                this.settings.completedIndicator,  // Add completed indicator
                this.settings.skippedIndicator     // Add skipped indicator
            );
        }
        
        // Save the updated content with completion records
        if (updatedContent !== content) {
            await this.app.vault.modify(file, updatedContent);
        }
        
        new Notice(`Updated due date and added ${missedDates.length} ${status} records.`);
    }
    
    private async completeCurrentRecurrence(
        file: TFile, 
        completionTime: string, 
        currentDue: string, 
        recurrence: RecurrenceInfo
    ) {
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
            this.settings.completedIndicator,  // Add completed indicator
            this.settings.skippedIndicator     // Add skipped indicator
        );
        
        // Save the updated content with completion record
        if (updatedContent !== content) {
            await this.app.vault.modify(file, updatedContent);
        }
        
        new Notice('Task completed and due date updated.');
    }

    async updateCompleteTimeField(file: TFile): Promise<boolean> {
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
    }
}