import { App, PluginSettingTab, Setting, TFolder } from "obsidian";
import { RecurringTasksSettings } from "./settings";
import RecurringTasksPlugin from "./main";

// Folder suggestion class
class FolderSuggest {
    private app: App;
    private inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        this.app = app;
        this.inputEl = inputEl;
        
        // Add event listeners for input
        inputEl.addEventListener('focus', this.onFocus.bind(this));
        inputEl.addEventListener('input', this.onInput.bind(this));
        inputEl.addEventListener('blur', this.onBlur.bind(this));
        
        // Create suggestion container
        this.suggestEl = document.createElement('div');
        this.suggestEl.className = 'suggestion-container';
        this.suggestEl.style.display = 'none';
        this.suggestEl.style.position = 'absolute';
        this.suggestEl.style.zIndex = '1000';
        document.body.appendChild(this.suggestEl);
    }
    
    private suggestEl: HTMLElement;
    private suggestions: string[] = [];
    private selectedIndex = 0;
    
    private onFocus() {
        this.updateSuggestions();
    }
    
    private onInput() {
        this.updateSuggestions();
    }
    
    private onBlur() {
        // Delay hiding to allow for clicks on suggestions
        setTimeout(() => {
            this.suggestEl.style.display = 'none';
        }, 100);
    }
    
    private updateSuggestions() {
        const inputValue = this.inputEl.value;
        this.suggestions = this.getFolderSuggestions(inputValue);
        
        if (this.suggestions.length > 0) {
            this.renderSuggestions();
            this.positionSuggestions();
            this.suggestEl.style.display = 'block';
        } else {
            this.suggestEl.style.display = 'none';
        }
    }
    
    private getFolderSuggestions(inputValue: string): string[] {
        const folders: string[] = [];
        const lowercaseInput = inputValue.toLowerCase();
        
        // Get all folders in the vault
        const allFolders = this.app.vault.getAllLoadedFiles()
            .filter(f => f instanceof TFolder)
            .map(f => f.path);
        
        // Add root folder
        if (''.startsWith(lowercaseInput)) {
            folders.push('');
        }
        
        // Filter folders based on input
        for (const folder of allFolders) {
            if (folder.toLowerCase().contains(lowercaseInput)) {
                folders.push(folder);
            }
        }
        
        return folders;
    }
    
    private renderSuggestions() {
        this.suggestEl.empty();
        this.selectedIndex = 0;
        
        for (let i = 0; i < this.suggestions.length; i++) {
            const suggestion = this.suggestions[i];
            const suggestionEl = document.createElement('div');
            suggestionEl.className = 'suggestion-item';
            suggestionEl.textContent = suggestion || '/';
            
            if (i === this.selectedIndex) {
                suggestionEl.classList.add('is-selected');
            }
            
            suggestionEl.addEventListener('click', () => {
                this.selectSuggestion(suggestion);
            });
            
            this.suggestEl.appendChild(suggestionEl);
        }
    }
    
    private positionSuggestions() {
        const rect = this.inputEl.getBoundingClientRect();
        this.suggestEl.style.top = `${rect.bottom}px`;
        this.suggestEl.style.left = `${rect.left}px`;
        this.suggestEl.style.width = `${rect.width}px`;
    }
    
    private selectSuggestion(value: string) {
        this.inputEl.value = value;
        this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        this.suggestEl.style.display = 'none';
    }
}

export class RecurringTasksSettingTab extends PluginSettingTab {
    plugin: RecurringTasksPlugin;

    constructor(app: App, plugin: RecurringTasksPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Recurring Tasks Settings" });

        // Directory Settings
        containerEl.createEl("h3", { text: "Directory Settings" });

        new Setting(containerEl)
            .setName("Tasks Directory")
            .setDesc("Directory where active tasks are stored")
            .addText(text => {
                text.setPlaceholder("Tasks")
                    .setValue(this.plugin.settings.tasksDirectory)
                    .onChange(async (value) => {
                        this.plugin.settings.tasksDirectory = value;
                        await this.plugin.saveSettings();
                    });
                
                // Add folder suggestions
                new FolderSuggest(this.app, text.inputEl);
            });

        new Setting(containerEl)
            .setName("Completed Tasks Directory")
            .setDesc("Directory where completed tasks are archived")
            .addText(text => {
                text.setPlaceholder("Tasks/Completed")
                    .setValue(this.plugin.settings.completedDirectory)
                    .onChange(async (value) => {
                        this.plugin.settings.completedDirectory = value;
                        await this.plugin.saveSettings();
                    });
                
                // Add folder suggestions
                new FolderSuggest(this.app, text.inputEl);
            });

        // Frontmatter Property Settings
        containerEl.createEl("h3", { text: "Frontmatter Properties" });

        new Setting(containerEl)
            .setName("Completion Property")
            .setDesc("Frontmatter property to track task completion status")
            .addText(text => text
                .setPlaceholder("Completed")
                .setValue(this.plugin.settings.completionProperty)
                .onChange(async (value) => {
                    this.plugin.settings.completionProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Completion Time Property")
            .setDesc("Frontmatter property to track when a task was completed")
            .addText(text => text
                .setPlaceholder("CompletedTime")
                .setValue(this.plugin.settings.completionTimeProperty)
                .onChange(async (value) => {
                    this.plugin.settings.completionTimeProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Recurrence Property")
            .setDesc("Frontmatter property that defines the recurrence pattern")
            .addText(text => text
                .setPlaceholder("Recurrence")
                .setValue(this.plugin.settings.recurrenceProperty)
                .onChange(async (value) => {
                    this.plugin.settings.recurrenceProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Due Date Property")
            .setDesc("Frontmatter property that defines the task due date")
            .addText(text => text
                .setPlaceholder("DueDate")
                .setValue(this.plugin.settings.dueDateProperty)
                .onChange(async (value) => {
                    this.plugin.settings.dueDateProperty = value;
                    await this.plugin.saveSettings();
                }));

        // Behavior Settings
        containerEl.createEl("h3", { text: "Behavior Settings" });

        new Setting(containerEl)
            .setName("Create New File on Completion")
            .setDesc("When a recurring task is completed, create a new file for the next occurrence and archive the completed one")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.createNewFileOnCompletion)
                .onChange(async (value) => {
                    this.plugin.settings.createNewFileOnCompletion = value;
                    await this.plugin.saveSettings();
                }));

        // Help Section
        containerEl.createEl("h3", { text: "Help" });
        
        const helpDiv = containerEl.createDiv({ cls: "recurring-tasks-help" });
        
        helpDiv.createEl("h4", { text: "Recurrence Pattern Examples" });
        
        const examplesUl = helpDiv.createEl("ul");
        examplesUl.createEl("li", { text: "every 1 day" });
        examplesUl.createEl("li", { text: "2 weeks" });
        examplesUl.createEl("li", { text: "1 month after completion" });
        examplesUl.createEl("li", { text: "1d (shorthand for every 1 day)" });
        examplesUl.createEl("li", { text: "2w (shorthand for every 2 weeks)" });
        examplesUl.createEl("li", { text: "1mc (shorthand for every 1 month after completion)" });
    }
}