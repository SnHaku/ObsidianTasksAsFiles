// ui/live-preview.ts
import { EditorView, ViewUpdate, ViewPlugin } from "@codemirror/view";
import { Plugin, TFile } from 'obsidian';

export function setupLivePreviewExtension(plugin: Plugin) {
    plugin.registerEditorExtension([
        createRecurringTaskViewPlugin(plugin)
    ]);
}

function createRecurringTaskViewPlugin(plugin: Plugin) {
    return ViewPlugin.fromClass(class {
        button: HTMLElement | null = null;
        lastProcessedFile: string | null = null;
        
        constructor(view: EditorView) {
            // Initial update
            setTimeout(() => this.updateButton(view), 100);
        }
        
        update(update: ViewUpdate) {
            // Only update if the document has changed significantly
            if (update.docChanged && update.changes.length > 0) {
                // Use setTimeout to avoid potential recursive updates
                setTimeout(() => this.updateButton(update.view), 100);
            }
        }
        
        async updateButton(view: EditorView) {
            try {
                // Get the current file
                const file = plugin.app.workspace.getActiveFile();
                if (!file) return;
                
                // Skip if we've already processed this file and nothing has changed
                if (this.lastProcessedFile === file.path) return;
                this.lastProcessedFile = file.path;
                
                // Remove existing button if it exists
                if (this.button && this.button.parentNode) {
                    this.button.remove();
                    this.button = null;
                }
                
                // @ts-ignore - We'll call this method from the main plugin class
                const { isTask, recurrence } = await plugin.isTaskWithRecurrence(file);
                if (!isTask || !recurrence) return;
                
                // Create the button
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
                this.button = buttonContainer;
                
                // Find where to insert the button (after frontmatter)
                const frontmatterEnd = this.findFrontmatterEnd(view);
                if (frontmatterEnd === -1) return;
                
                // Insert the button after frontmatter
                const domAtPos = view.domAtPos(frontmatterEnd);
                if (!domAtPos.node) return;
                
                let targetNode = domAtPos.node;
                if (targetNode.nodeType === Node.TEXT_NODE && targetNode.parentNode) {
                    targetNode = targetNode.parentNode;
                }
                
                if (targetNode.parentNode) {
                    targetNode.parentNode.insertBefore(buttonContainer, targetNode.nextSibling);
                }
            } catch (error) {
                console.error("Error in updateButton:", error);
            }
        }
        
        findFrontmatterEnd(view: EditorView): number {
            try {
                const doc = view.state.doc;
                const text = doc.toString();
                const frontmatterMatch = /^---\n([\s\S]*?)\n---/.exec(text);
                
                if (frontmatterMatch) {
                    return frontmatterMatch[0].length;
                }
                
                return -1;
            } catch (error) {
                console.error("Error in findFrontmatterEnd:", error);
                return -1;
            }
        }
        
        destroy() {
            if (this.button && this.button.parentNode) {
                this.button.remove();
                this.button = null;
            }
        }
    });
}