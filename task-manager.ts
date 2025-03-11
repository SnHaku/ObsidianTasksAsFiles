// task-manager.ts
import { App, Notice, TFile } from 'obsidian';
import { moment } from 'obsidian';
import { RecurrenceInfo, calculateNextDueDate, getMissedRecurrences, parseRecurrence } from './recurrence-parser';
import { updateFrontmatterProperty, addCompletionRecord, isNoteATask } from './utils';
import { RecurringTasksSettings } from './settings';
import { MissedRecurrencesModal } from './ui/missed-recurrences-modal';

export class TaskManager {
    app: App;
    settings: RecurringTasksSettings;
    
    constructor(app: App, settings: RecurringTasksSettings) {
        this.app = app;
        this.settings = settings;
    }
    
    async isTaskWithRecurrence(file: TFile): Promise<{ isTask: boolean, recurrence: RecurrenceInfo | null }> {
        if (!file || file.extension !== 'md') {
            return { isTask: false, recurrence: null };
        }
        
        // Use Obsidian's metadataCache to get frontmatter
        const metadata = this.app.metadataCache.getFileCache(file);
        if (!metadata || !metadata.frontmatter) {
            return { isTask: false, recurrence: null };
        }
        
        const frontmatter = metadata.frontmatter;
        
        // Check if it's a task
        const isTask = isNoteATask(
            frontmatter, 
            this.settings.taskTypeProperty, 
            this.settings.taskTypeSingularProperty, 
            this.settings.taskTypeValue
        );
        
        if (!isTask) {
            return { isTask: false, recurrence: null };
        }
        
        // Check if it has a recurrence
        const recurProperty = this.settings.recurProperty;
        const recurrenceString = frontmatter[recurProperty];
        const recurrence = parseRecurrence(recurrenceString);
        
        return { isTask, recurrence };
    }
    
    async completeRecurrence(file: TFile, recurrence: RecurrenceInfo) {
        // Get the current content and frontmatter
        const content = await this.app.vault.read(file);
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
        // Get the current content of the file
        const content = await this.app.vault.read(file);
        
        // Calculate the next due date
        const nextDue = calculateNextDueDate(currentDue, now, recurrence);
        
        // Update the frontmatter with the new due date
        let updatedContent = updateFrontmatterProperty(content, this.settings.dueProperty, nextDue);
        
        // Add completion records for missed dates
        const status = action === 'complete' ? 'completed' : 'skipped';
        for (const missedDate of missedDates) {
            updatedContent = addCompletionRecord(
                updatedContent, 
                missedDate, 
                status, 
                this.settings.completionHeading, 
                this.settings.completionPosition,
                this.settings.dateTimeFormat
            );
        }
        
        // Save the updated content
        await this.app.vault.modify(file, updatedContent);
        
        new Notice(`Updated due date and added ${missedDates.length} ${status} records.`);
    }
    
    private async completeCurrentRecurrence(
        file: TFile, 
        completionTime: string, 
        currentDue: string, 
        recurrence: RecurrenceInfo
    ) {
        // Get the current content of the file
        const content = await this.app.vault.read(file);
        
        // Calculate the next due date
        const nextDue = calculateNextDueDate(currentDue, completionTime, recurrence);
        
        // Update the frontmatter with the new due date
        let updatedContent = updateFrontmatterProperty(content, this.settings.dueProperty, nextDue);
        
        // Add a completion record
        updatedContent = addCompletionRecord(
            updatedContent, 
            completionTime, 
            'completed', 
            this.settings.completionHeading, 
            this.settings.completionPosition,
            this.settings.dateTimeFormat
        );
        
        // Save the updated content
        await this.app.vault.modify(file, updatedContent);
        
        new Notice('Task completed and due date updated.');
    }
}