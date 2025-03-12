// ui/task-controls.ts
import { TFile, MarkdownView } from 'obsidian';
import RecurringTasksPlugin from '../main';
import { createCompleteTaskButton, createCompleteRecurrenceButton, createTaskInfoDisplay } from './components';

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
    
    // Complete/Uncomplete Task button
    const completeTaskButton = createCompleteTaskButton(plugin, file, isDone);
    buttonsContainer.appendChild(completeTaskButton);
    
    // Complete Current Recurrence button for recurring tasks
    if (recurrence && !isDone) {
        const completeRecurrenceButton = createCompleteRecurrenceButton(plugin, file, recurrence);
        buttonsContainer.appendChild(completeRecurrenceButton);
    }
    
    container.appendChild(buttonsContainer);
    
    // Right side: Due date or completion status
    const infoContainer = createTaskInfoDisplay(plugin, file, isDone);
    container.appendChild(infoContainer);
    
    return container;
}