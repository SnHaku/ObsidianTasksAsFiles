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
    
    // CompleteTime management settings
    completeTimeProperty: 'CompleteTime',
    updateCompleteTimeOnSave: true,
    updateCompleteTimeOnBlur: false
};

export class RecurringTasksSettingTab extends PluginSettingTab {
    plugin: RecurringTasksPlugin;

    constructor(app: App, plugin: RecurringTasksPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        // Task Identification and Recurrence Section
        containerEl.createEl('h2', {text: 'Task Identification & Recurrence'});
        
        new Setting(containerEl)
            .setName('Task Type Property')
            .setDesc('YAML property name that identifies a note as a task (works with both singular values and arrays)')
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
            .setDesc('YAML property name for the task due date')
            .addText(text => text
                .setValue(this.plugin.settings.dueProperty)
                .onChange(async (value) => {
                    this.plugin.settings.dueProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Done Property')
            .setDesc('YAML property name for the task completion status')
            .addText(text => text
                .setValue(this.plugin.settings.doneProperty)
                .onChange(async (value) => {
                    this.plugin.settings.doneProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Recurrence Property')
            .setDesc('YAML property name for the recurrence pattern')
            .addText(text => text
                .setValue(this.plugin.settings.recurProperty)
                .onChange(async (value) => {
                    this.plugin.settings.recurProperty = value;
                    await this.plugin.saveSettings();
                }));

        // Completion Records Section
        containerEl.createEl('h2', {text: 'Completion Records'});

        new Setting(containerEl)
            .setName('Completion Heading')
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
            .setName('Date Time Format')
            .setDesc('Format for datetime in completion records (Moment.js format)')
            .addText(text => text
                .setValue(this.plugin.settings.dateTimeFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dateTimeFormat = value;
                    await this.plugin.saveSettings();
                }));
                
        // CompleteTime Management Section
        containerEl.createEl('h2', {text: 'CompleteTime Management'});
        
        new Setting(containerEl)
            .setName('Complete Time Property')
            .setDesc('YAML property name for when the task was completed')
            .addText(text => text
                .setValue(this.plugin.settings.completeTimeProperty)
                .onChange(async (value) => {
                    this.plugin.settings.completeTimeProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Update CompleteTime on Save')
            .setDesc('Automatically update the CompleteTime field when a task is saved')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.updateCompleteTimeOnSave)
                .onChange(async (value) => {
                    this.plugin.settings.updateCompleteTimeOnSave = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Update CompleteTime on Blur')
            .setDesc('Automatically update the CompleteTime field when switching away from a task')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.updateCompleteTimeOnBlur)
                .onChange(async (value) => {
                    this.plugin.settings.updateCompleteTimeOnBlur = value;
                    await this.plugin.saveSettings();
                }));
    }
}