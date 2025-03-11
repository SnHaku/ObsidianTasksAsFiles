// ui/reading-view.ts
import { Plugin, TFile } from 'obsidian';
import { RecurrenceInfo } from '../recurrence-parser';

export function setupReadingView(plugin: Plugin) {
    plugin.registerMarkdownPostProcessor((element, context) => {
        processMarkdownView(element, context, plugin);
    });
}

async function processMarkdownView(element: HTMLElement, context: any, plugin: Plugin) {
    // Only process if this is a full document view (not a preview or embed)
    if (!context.sourcePath) return;
    
    const file = plugin.app.vault.getAbstractFileByPath(context.sourcePath);
    if (!file || !(file instanceof TFile)) return;
    
    // @ts-ignore - We'll call this method from the main plugin class
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
            // @ts-ignore - We'll call this method from the main plugin class
            await plugin.completeRecurrence(file, recurrence);
        });
        
        buttonContainer.appendChild(button);
        frontmatterEl.after(buttonContainer);
    }
}