// ui/live-preview.ts
import { EditorView, ViewPlugin, WidgetType, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
import { Plugin, TFile, MarkdownView } from 'obsidian';
import { RecurrenceInfo } from '../recurrence-parser';

export function setupLivePreviewExtension(plugin: Plugin) {
    // Register an event to detect when a file is opened in the editor
    plugin.registerEvent(
        plugin.app.workspace.on('file-open', async (file: TFile | null) => {
            if (!file) return;
            
            // Check if it's a recurring task
            try {
                // @ts-ignore - We'll call this method from the main plugin class
                const { isTask, recurrence, isDone } = await plugin.isTaskWithRecurrence(file);
                
                // Remove any existing button
                const existingButton = document.querySelector('.recurring-task-lp-button-container');
                if (existingButton) {
                    existingButton.remove();
                }
                
                // If it's a task with recurrence and not done, add the button
                if (isTask && recurrence && !isDone) {
                    // Get the active leaf
                    const activeLeaf = plugin.app.workspace.activeLeaf;
                    if (!activeLeaf) return;
                    
                    const view = activeLeaf.view;
                    if (!view || !(view instanceof MarkdownView)) return;
                    
                    // Get the editor container element
                    const editorEl = view.containerEl.querySelector('.cm-editor');
                    if (!editorEl) return;
                    
                    // Create button container
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'recurring-task-lp-button-container';
                    buttonContainer.style.position = 'sticky';
                    buttonContainer.style.top = '0';
                    buttonContainer.style.zIndex = '10';
                    buttonContainer.style.backgroundColor = 'var(--background-primary)';
                    buttonContainer.style.padding = '8px 0';
                    buttonContainer.style.textAlign = 'center';
                    buttonContainer.style.borderBottom = '1px solid var(--background-modifier-border)';
                    
                    // Create the button
                    const button = document.createElement('button');
                    button.textContent = 'Complete Current Recurrence';
                    button.className = 'recurring-task-complete-button';
                    
                    button.addEventListener('click', async () => {
                        // @ts-ignore - We'll call this method from the main plugin class
                        await plugin.completeRecurrence(file, recurrence);
                        
                        // Remove the button after completion
                        buttonContainer.remove();
                    });
                    
                    buttonContainer.appendChild(button);
                    
                    // Insert at the top of the editor
                    editorEl.insertBefore(buttonContainer, editorEl.firstChild);
                }
            } catch (error) {
                console.error("Error checking if file is a recurring task:", error);
            }
        })
    );
}