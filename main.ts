// main.ts
import { App, MarkdownView, Modal, Notice, Plugin, TFile } from 'obsidian';
import { moment } from 'obsidian';
import { EditorView, ViewUpdate, ViewPlugin } from "@codemirror/view";
import { RecurringTasksSettings, DEFAULT_SETTINGS, RecurringTasksSettingTab } from './settings';
import { parseRecurrence, calculateNextDueDate, getMissedRecurrences, RecurrenceInfo } from './recurrence-parser';
import { updateFrontmatterProperty, addCompletionRecord, isNoteATask } from './utils';

export default class RecurringTasksPlugin extends Plugin {
    settings: RecurringTasksSettings;

    async onload() {
        await this.loadSettings();

        // Register settings tab
        this.addSettingTab(new RecurringTasksSettingTab(this.app, this));

        // Register the markdown post processor for Reading View
        this.registerMarkdownPostProcessor((element, context) => {
            this.processMarkdownView(element, context);
        });

        // Setup Live Preview extension
        this.setupLivePreviewExtension();

        // Add CSS styles
        this.loadStyles();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private loadStyles() {
        const styleEl = document.createElement('style');
        styleEl.id = 'recurring-tasks-styles';
        styleEl.textContent = `
            .recurring-task-button-container {
                margin: 1em 0;
                text-align: center;
            }
            
            .recurring-task-complete-button {
                background-color: var(--interactive-accent);
                color: var(--text-on-accent);
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-size: 14px;
            }
            
            .recurring-task-complete-button:hover {
                background-color: var(--interactive-accent-hover);
            }
            
            .missed-recurrences-buttons {
                display: flex;
                justify-content: space-around;
                margin-top: 1em;
            }
            
            .missed-recurrences-buttons button {
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
            }
        `;
        document.head.appendChild(styleEl);
    }

    private setupLivePreviewExtension() {
        const plugin = this;
        
        this.registerEditorExtension([
            ViewPlugin.fromClass(class {
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
                        
                        // Check if it's a recurring task
                        const { isTask, recurrence } = await plugin.isTaskWithRecurrence(file);
                        if (!isTask || !recurrence) return;
                        
                        // Create the button
                        const buttonContainer = document.createElement('div');
                        buttonContainer.className = 'recurring-task-button-container';
                        
                        const button = document.createElement('button');
                        button.textContent = 'Complete Current Recurrence';
                        button.className = 'recurring-task-complete-button';
                        
                        button.addEventListener('click', async () => {
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
            })
        ]);
    }

    private async processMarkdownView(element: HTMLElement, context: any) {
        // Debug notice
        new Notice("Processing markdown view");
        
        // Only process if this is a full document view (not a preview or embed)
        if (!context.sourcePath) return;
        
        const file = this.app.vault.getAbstractFileByPath(context.sourcePath);
        if (!file || !(file instanceof TFile)) return;
        
        // Debug notice
        new Notice(`Processing file: ${file.path}`);
        
        const { isTask, recurrence } = await this.isTaskWithRecurrence(file);
        
        // Debug notice
        new Notice(`Is task: ${isTask}, Has recurrence: ${recurrence !== null}`);
        
        if (isTask && recurrence) {
            // Find the frontmatter element
            const frontmatterEl = element.querySelector('.frontmatter');
            
            // Debug notice
            new Notice(`Frontmatter element found: ${frontmatterEl !== null}`);
            
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
                await this.completeRecurrence(file, recurrence);
            });
            
            buttonContainer.appendChild(button);
            frontmatterEl.after(buttonContainer);
            
            // Debug notice
            new Notice("Button added");
        }
    }

    private async isTaskWithRecurrence(file: TFile): Promise<{ isTask: boolean, recurrence: RecurrenceInfo | null }> {
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

    private async completeRecurrence(file: TFile, recurrence: RecurrenceInfo) {
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

class MissedRecurrencesModal extends Modal {
    private missedDates: string[];
    private callback: (action: string) => void;
    
    constructor(app: App, missedDates: string[], callback: (action: string) => void) {
        super(app);
        this.missedDates = missedDates;
        this.callback = callback;
    }
    
    onOpen() {
        const {contentEl} = this;
        
        contentEl.createEl('h2', {text: 'Missed Recurrences'});
        contentEl.createEl('p', {
            text: `This task has ${this.missedDates.length} missed recurrences. How would you like to handle them?`
        });
        
        const buttonContainer = contentEl.createEl('div', {cls: 'missed-recurrences-buttons'});
        
        const completeAllButton = buttonContainer.createEl('button', {
            text: 'Mark all as complete',
            cls: 'mod-cta'
        });
        completeAllButton.addEventListener('click', () => {
            this.callback('complete');
            this.close();
        });
        
        const skipAllButton = buttonContainer.createEl('button', {
            text: 'Mark all as skipped'
        });
        skipAllButton.addEventListener('click', () => {
            this.callback('skip');
            this.close();
        });
    }
    
    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}