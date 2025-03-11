// main.ts
import { Plugin, TFile } from 'obsidian';
import { RecurringTasksSettings, DEFAULT_SETTINGS, RecurringTasksSettingTab } from './settings';
import { setupReadingView } from './ui/reading-view';
import { setupLivePreviewExtension } from './ui/live-preview';
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

        // Setup Reading View
        setupReadingView(this);

        // Setup Live Preview extension
        setupLivePreviewExtension(this);

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

    // These methods are called from the UI components
    async isTaskWithRecurrence(file: TFile): Promise<{ isTask: boolean, recurrence: RecurrenceInfo | null }> {
        return this.taskManager.isTaskWithRecurrence(file);
    }

    async completeRecurrence(file: TFile, recurrence: RecurrenceInfo) {
        return this.taskManager.completeRecurrence(file, recurrence);
    }
}