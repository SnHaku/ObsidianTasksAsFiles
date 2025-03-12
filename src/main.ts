// main.ts (updated)
import { Plugin, TFile } from 'obsidian';
import { RecurringTasksSettings, DEFAULT_SETTINGS, RecurringTasksSettingTab } from './settings';
import { setupTaskControls } from './ui/task-controls'; // New import
import { TaskManager } from './task-manager';
import { RecurrenceInfo } from './recurrence-parser';

export default class RecurringTasksPlugin extends Plugin {
    settings: RecurringTasksSettings;
    taskManager: TaskManager;

    async onload() {
        await this.loadSettings();

        // Initialize the task manager
        this.taskManager = new TaskManager(this.app, this.settings);

        // Register settings tab
        this.addSettingTab(new RecurringTasksSettingTab(this.app, this));

        // Setup unified task controls (replaces the previous Reading View and Live Preview setup)
        setupTaskControls(this);

        // Add CSS styles
        this.loadStyles();

        // Hook into manual save command
        if (this.settings.updateCompleteTimeOnSave) {
            // Use type assertion to tell TypeScript that commands exists
            const appWithCommands = this.app as any;
            const saveCommand = appWithCommands.commands.findCommand('editor:save-file');
            if (saveCommand) {
                const originalCallback = saveCommand.callback;
                saveCommand.callback = async () => {
                    // First, run the original save
                    if (originalCallback) {
                        originalCallback();
                    }
                    
                    // Then update the CompleteTime field
                    const file = this.app.workspace.getActiveFile();
                    if (file && file.extension === 'md') {
                        // Use a small timeout to ensure the save has completed
                        setTimeout(async () => {
                            const updated = await this.taskManager.updateCompleteTimeField(file);
                            
                            // If the CompleteTime field was updated, refresh the UI
                            if (updated) {
                                // Trigger a file-open event to refresh the button visibility
                                this.app.workspace.trigger('file-open', file);
                            }
                        }, 100);
                    }
                };
            }
        }

        // Register event for editor blur if enabled
        if (this.settings.updateCompleteTimeOnBlur) {
            this.registerEvent(
                this.app.workspace.on('active-leaf-change', (leaf) => {
                    const previousFile = this.app.workspace.getActiveFile();
                    if (previousFile && previousFile.extension === 'md') {
                        this.taskManager.updateCompleteTimeField(previousFile);
                    }
                })
            );
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        
        // Re-register events based on new settings
        // Force refresh the current file to update UI
        this.app.workspace.trigger('file-open', this.app.workspace.getActiveFile());
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
            
            .task-controls-container {
                width: 100%;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // These methods are called from the UI components
    async isTaskWithRecurrence(file: TFile): Promise<{ isTask: boolean, recurrence: RecurrenceInfo | null, isDone: boolean }> {
        return this.taskManager.isTaskWithRecurrence(file);
    }

    async completeRecurrence(file: TFile, recurrence: RecurrenceInfo) {
        return this.taskManager.completeRecurrence(file, recurrence);
    }
}