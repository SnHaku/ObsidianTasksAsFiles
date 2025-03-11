// ui/reading-view.ts
import { TFile } from 'obsidian';
import { RecurrenceInfo } from '../recurrence-parser';
import RecurringTasksPlugin from '../main'; // Import the specific plugin class

export function setupReadingView(plugin: RecurringTasksPlugin) { // Change type to RecurringTasksPlugin
    plugin.registerMarkdownPostProcessor((element, context) => {
        processMarkdownView(element, context, plugin);
    });
}

async function processMarkdownView(element: HTMLElement, context: any, plugin: RecurringTasksPlugin) { // Change type here too
    // Only process if this is a full document view (not a preview or embed)
    if (!context.sourcePath) return;
    
    const file = plugin.app.vault.getAbstractFileByPath(context.sourcePath);
    if (!file || !(file instanceof TFile)) return;
    
    // Now we can directly call the method without type assertion
    const { isTask, recurrence, isDone } = await plugin.isTaskWithRecurrence(file);
    
    // Only show the button if it's a task with recurrence and not done
    if (isTask && recurrence && !isDone) {
        // Find the frontmatter element
        const frontmatterEl = element.querySelector('.frontmatter');
        
        if (!frontmatterEl) return;
        
        // Check if we've already added a button to this view
        if (element.querySelector('.recurring-task-button-container')) return;
        
        // Add the completion button
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'recurring-task-button-container';
        
        const button = document.createElement('button');
        button.textContent = 'Complete Current Recurrence';
        button.className = 'recurring-task-complete-button';
        
        button.addEventListener('click', async () => {
            // Now we can directly call the method without type assertion
            await plugin.completeRecurrence(file, recurrence);
            
            // Check if the task is now done
            const { isDone } = await plugin.isTaskWithRecurrence(file);
            if (isDone) {
                buttonContainer.remove();
            }
        });
        
        buttonContainer.appendChild(button);
        frontmatterEl.after(buttonContainer);
    }
}