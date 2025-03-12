// ui/components.ts
import { TFile } from 'obsidian';
import RecurringTasksPlugin from '../main';
import { RecurrenceInfo } from '../recurrence-parser';
import { refreshUI } from '../utils/common';
import { toggleTaskDoneStatus } from '../utils/frontmatter-helper';

/**
 * Creates a button for completing or uncompleting a task
 */
export function createCompleteTaskButton(
    plugin: RecurringTasksPlugin,
    file: TFile,
    isDone: boolean
): HTMLElement {
    const button = document.createElement('button');
    button.className = 'recurring-task-complete-button';
    button.textContent = isDone 
        ? `Uncomplete ${plugin.settings.taskTypeValue}` 
        : `Complete ${plugin.settings.taskTypeValue}`;
    
    button.addEventListener('click', async () => {
        // Toggle the done status and update CompleteTime in a single operation
        await toggleTaskDoneStatus(
            plugin.app,
            file,
            plugin.settings,
            isDone
        );
        
        // Refresh the UI
        refreshUI(plugin.app, file);
    });
    
    return button;
}

/**
 * Creates a button for completing the current recurrence
 */
export function createCompleteRecurrenceButton(
    plugin: RecurringTasksPlugin,
    file: TFile,
    recurrence: RecurrenceInfo
): HTMLElement {
    const button = document.createElement('button');
    button.className = 'recurring-task-complete-button';
    button.textContent = 'Complete Current Recurrence';
    
    button.addEventListener('click', async () => {
        await plugin.completeRecurrence(file, recurrence);
        refreshUI(plugin.app, file, 100);
    });
    
    return button;
}

/**
 * Creates the task info display element
 */
export function createTaskInfoDisplay(
    plugin: RecurringTasksPlugin,
    file: TFile,
    isDone: boolean
): HTMLElement {
    const infoContainer = document.createElement('div');
    infoContainer.className = 'task-info';
    infoContainer.style.paddingRight = '12px';
    
    // Get the latest metadata
    const metadata = plugin.app.metadataCache.getFileCache(file);
    if (metadata && metadata.frontmatter) {
        if (isDone) {
            // Show completion status
            const statusElement = document.createElement('span');
            statusElement.className = 'task-completion-status';
            statusElement.textContent = `${plugin.settings.taskTypeValue} Completed!`;
            statusElement.style.color = 'var(--text-success)';
            infoContainer.appendChild(statusElement);
        } else {
            // Show due date if available
            const dueProperty = plugin.settings.dueProperty;
            if (metadata.frontmatter[dueProperty]) {
                const dueDate = metadata.frontmatter[dueProperty];
                const dueDateElement = document.createElement('span');
                dueDateElement.className = 'task-due-date';
                dueDateElement.textContent = `${dueProperty}: ${dueDate}`;
                infoContainer.appendChild(dueDateElement);
            }
        }
    }
    
    return infoContainer;
}