// settings.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import RecurringTasksPlugin from './main';

export interface RecurringTasksSettings {
    // Task identification and recurrence settings
    taskTypeProperty: string;
    taskTypeValue: string;
    dueProperty: string;
    doneProperty: string;
    recurProperty: string;
    
    // Completion records settings
    completionHeading: string;
    completionPosition: 'top' | 'bottom';
    dateTimeFormat: string;
    completedIndicator: string;  // New setting for completed status
    skippedIndicator: string;    // New setting for skipped status
    
    // CompleteTime management settings
    completeTimeProperty: string;
    updateCompleteTimeOnSave: boolean;
    updateCompleteTimeOnBlur: boolean;
}

export const DEFAULT_SETTINGS: RecurringTasksSettings = {
    // Task identification and recurrence settings
    taskTypeProperty: 'Type',
    taskTypeValue: 'Task',
    dueProperty: 'Due',
    doneProperty: 'Done',
    recurProperty: 'Recur',
    
    // Completion records settings
    completionHeading: 'Completions',
    completionPosition: 'bottom',
    dateTimeFormat: 'YYYY-MM-DDTHH:mm:ssZ',
    completedIndicator: 'Done',  // Default completed indicator
    skippedIndicator: 'Skipped',   // Default skipped indicator
    
    // CompleteTime management settings
    completeTimeProperty: 'CompleteTime',
    updateCompleteTimeOnSave: false,
    updateCompleteTimeOnBlur: true
};

export class RecurringTasksSettingTab extends PluginSettingTab {
    plugin: RecurringTasksPlugin;

    constructor(app: App, plugin: RecurringTasksPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Recurring Tasks Settings' });

        // Task Identification & Recurrence section
        containerEl.createEl('h3', { text: 'Task Identification & Recurrence' });

        new Setting(containerEl)
            .setName('Task Type Property')
            .setDesc('Property name used to identify a note as a task')
            .addText(text => text
                .setValue(this.plugin.settings.taskTypeProperty)
                .onChange(async (value) => {
                    this.plugin.settings.taskTypeProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Task Type Value')
            .setDesc('Value that identifies a note as a task')
            .addText(text => text
                .setValue(this.plugin.settings.taskTypeValue)
                .onChange(async (value) => {
                    this.plugin.settings.taskTypeValue = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Due Date Property')
            .setDesc('Property name for due date')
            .addText(text => text
                .setValue(this.plugin.settings.dueProperty)
                .onChange(async (value) => {
                    this.plugin.settings.dueProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Done Property')
            .setDesc('Property name for done status')
            .addText(text => text
                .setValue(this.plugin.settings.doneProperty)
                .onChange(async (value) => {
                    this.plugin.settings.doneProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Recurrence Property')
            .setDesc('Property name for recurrence pattern')
            .addText(text => text
                .setValue(this.plugin.settings.recurProperty)
                .onChange(async (value) => {
                    this.plugin.settings.recurProperty = value;
                    await this.plugin.saveSettings();
                }));

        // Completion Records section
        containerEl.createEl('h3', { text: 'Completion Records' });

        new Setting(containerEl)
            .setName('Completion Section Heading')
            .setDesc('Heading text for the completion records section')
            .addText(text => text
                .setValue(this.plugin.settings.completionHeading)
                .onChange(async (value) => {
                    this.plugin.settings.completionHeading = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Completion Section Position')
            .setDesc('Where to place the completion records section')
            .addDropdown(dropdown => dropdown
                .addOption('top', 'Top (after frontmatter)')
                .addOption('bottom', 'Bottom (end of note)')
                .setValue(this.plugin.settings.completionPosition)
                .onChange(async (value: 'top' | 'bottom') => {
                    this.plugin.settings.completionPosition = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Datetime Format')
            .setDesc('Format for dates in completion records (using Moment.js format)')
            .addText(text => text
                .setValue(this.plugin.settings.dateTimeFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dateTimeFormat = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Completed Status Indicator')
            .setDesc('Symbol or text to use for completed recurrences in the table')
            .addText(text => text
                .setValue(this.plugin.settings.completedIndicator)
                .onChange(async (value) => {
                    this.plugin.settings.completedIndicator = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Skipped Status Indicator')
            .setDesc('Symbol or text to use for skipped recurrences in the table')
            .addText(text => text
                .setValue(this.plugin.settings.skippedIndicator)
                .onChange(async (value) => {
                    this.plugin.settings.skippedIndicator = value;
                    await this.plugin.saveSettings();
                }));

        // CompleteTime Management section
        containerEl.createEl('h3', { text: 'CompleteTime Management' });

        new Setting(containerEl)
            .setName('CompleteTime Property')
            .setDesc('Property name for completion timestamp')
            .addText(text => text
                .setValue(this.plugin.settings.completeTimeProperty)
                .onChange(async (value) => {
                    this.plugin.settings.completeTimeProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Update CompleteTime on Save')
            .setDesc('Automatically update CompleteTime when saving a note')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.updateCompleteTimeOnSave)
                .onChange(async (value) => {
                    this.plugin.settings.updateCompleteTimeOnSave = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Update CompleteTime on Blur')
            .setDesc('Automatically update CompleteTime when switching away from a note')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.updateCompleteTimeOnBlur)
                .onChange(async (value) => {
                    this.plugin.settings.updateCompleteTimeOnBlur = value;
                    await this.plugin.saveSettings();
                }));
    }
}