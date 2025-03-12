// ui/task-controls.ts - Fixed implementation

import { TFile, MarkdownView } from 'obsidian';
import { moment } from 'obsidian';
import RecurringTasksPlugin from '../main';

export function setupTaskControls(plugin: RecurringTasksPlugin) {
    // Register for file-open events to update the controls for both modes
    plugin.registerEvent(
        plugin.app.workspace.on('file-open', async (file: TFile | null) => {
            if (!file) return;
            updateTaskControls(plugin, file);
        })
    );
    
    // Also register for layout-change to catch Reading/Editing mode switches
    plugin.registerEvent(
        plugin.app.workspace.on('layout-change', () => {
            const file = plugin.app.workspace.getActiveFile();
            if (file) {
                updateTaskControls(plugin, file);
            }
        })
    );

    // Add an additional event for metadata-cache changes
    plugin.registerEvent(
        plugin.app.metadataCache.on('changed', (file) => {
            const activeFile = plugin.app.workspace.getActiveFile();
            if (activeFile && activeFile.path === file.path) {
                updateTaskControls(plugin, file);
            }
        })
    );
}

async function updateTaskControls(plugin: RecurringTasksPlugin, file: TFile) {
    try {
        // Remove any existing controls
        const existingControls = document.querySelector('.task-controls-container');
        if (existingControls) {
            existingControls.remove();
        }
        
        // Check if it's a task - get the latest data directly from the file
        const { isTask, recurrence, isDone } = await plugin.isTaskWithRecurrence(file);
        
        if (!isTask) return; // Only proceed for tasks
        
        // Get the active view
        const activeLeaf = plugin.app.workspace.activeLeaf;
        if (!activeLeaf) return;
        
        const view = activeLeaf.view;
        if (!view || !(view instanceof MarkdownView)) return;
        
        // Get the container element based on the current mode
        let targetContainer: HTMLElement | null = null;
        const isEditingMode = view.getMode() === 'source';
        
        if (isEditingMode) {
            targetContainer = view.containerEl.querySelector('.cm-editor');
        } else {
            // Reading mode
            targetContainer = view.containerEl.querySelector('.markdown-reading-view');
        }
        
        if (!targetContainer) return;
        
        // Create controls container
        const controlsContainer = createControlsContainer(plugin, file, isTask, recurrence, isDone);
        
        // Insert at the top of the container
        targetContainer.insertBefore(controlsContainer, targetContainer.firstChild);
        
    } catch (error) {
        console.error("Error updating task controls:", error);
    }
}

function createControlsContainer(
    plugin: RecurringTasksPlugin, 
    file: TFile, 
    isTask: boolean, 
    recurrence: any, 
    isDone: boolean
): HTMLElement {
    // Create container
    const container = document.createElement('div');
    container.className = 'task-controls-container';
    container.style.position = 'sticky';
    container.style.top = '0';
    container.style.zIndex = '10';
    container.style.backgroundColor = 'var(--background-primary)';
    container.style.padding = '8px 0';
    container.style.display = 'flex';
    container.style.justifyContent = 'space-between';
    container.style.alignItems = 'center';
    container.style.borderBottom = '1px solid var(--background-modifier-border)';
    
    // Left side: Buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'task-buttons';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.gap = '8px';
    buttonsContainer.style.paddingLeft = '12px';
    
    // Get the task type value from settings
    const taskTypeValue = plugin.settings.taskTypeValue;
    
    // Complete/Uncomplete Task button for all tasks
    const completeTaskButton = document.createElement('button');
    completeTaskButton.className = 'recurring-task-complete-button'; // Use the existing style class
    completeTaskButton.textContent = isDone ? `Uncomplete ${taskTypeValue}` : `Complete ${taskTypeValue}`;
    
    completeTaskButton.addEventListener('click', async () => {
        // Get the current time for CompleteTime
        const now = moment().format();
        
        // Update both Done and CompleteTime properties in a single operation
        await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
            if (frontmatter) {
                const doneProperty = plugin.settings.doneProperty;
                const completeTimeProperty = plugin.settings.completeTimeProperty;
                
                // Toggle the Done property
                frontmatter[doneProperty] = !isDone;
                
                // Update CompleteTime based on the new Done state
                if (!isDone) { // It's becoming true
                    frontmatter[completeTimeProperty] = now;
                } else { // It's becoming false
                    frontmatter[completeTimeProperty] = '';
                }
            }
        });
        
        // Force a UI refresh by triggering a file-open event
        setTimeout(() => {
            plugin.app.workspace.trigger('file-open', file);
        }, 50);
    });
    
    buttonsContainer.appendChild(completeTaskButton);
    
    // Complete Current Recurrence button for recurring tasks
    if (recurrence && !isDone) {
        const completeRecurrenceButton = document.createElement('button');
        completeRecurrenceButton.className = 'recurring-task-complete-button';
        completeRecurrenceButton.textContent = `Complete Current Recurrence`;
        
        completeRecurrenceButton.addEventListener('click', async () => {
            await plugin.completeRecurrence(file, recurrence);
            
            // Force a UI refresh by triggering a file-open event
            // Use a timeout to ensure the file modifications are complete
            setTimeout(() => {
                plugin.app.workspace.trigger('file-open', file);
            }, 100);
        });
        
        buttonsContainer.appendChild(completeRecurrenceButton);
    }
    
    container.appendChild(buttonsContainer);
    
    // Right side: Due date or completion status
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
            statusElement.textContent = `${taskTypeValue} Completed!`;
            statusElement.style.color = 'var(--text-success)'; // Use success color for completed tasks
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
    
    container.appendChild(infoContainer);
    
    return container;
}