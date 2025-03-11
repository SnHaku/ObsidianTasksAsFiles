import { App, Editor, MarkdownView, Plugin, TFile, TAbstractFile } from 'obsidian';
import { RecurringTasksSettings, DEFAULT_SETTINGS } from './settings';
import { RecurringTasksSettingTab } from './settings-tab';
import { TaskManager } from './task-manager';

export default class RecurringTasksPlugin extends Plugin {
    settings: RecurringTasksSettings;
    taskManager: TaskManager;

    async onload() {
		await this.loadSettings();
	
		// Initialize the task manager
		this.taskManager = new TaskManager(this.app, this.settings);
	
		// Add settings tab
		this.addSettingTab(new RecurringTasksSettingTab(this.app, this));
	
		// Register event handlers for file modifications
		this.registerEvent(
			this.app.vault.on('modify', (file: TAbstractFile) => {
				// Check if the file is a TFile before processing
				if (file instanceof TFile) {
					this.handleFileModification(file);
				}
			})
		);
	
		// Add command to mark a task as completed
		this.addCommand({
			id: 'mark-task-completed',
			name: 'Mark task as completed',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file && file.extension === 'md' && this.isTaskFile(file)) {
					if (!checking) {
						this.completeTask(file);
					}
					return true;
				}
				return false;
			}
		});
	
		// Add command to mark a task as incomplete
		this.addCommand({
			id: 'mark-task-incomplete',
			name: 'Mark task as incomplete',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file && file.extension === 'md' && this.isTaskFile(file)) {
					if (!checking) {
						this.incompleteTask(file);
					}
					return true;
				}
				return false;
			}
		});
	
		console.log('Recurring Tasks plugin loaded');
	}

    onunload() {
        console.log('Recurring Tasks plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
	 * Handle file modifications to detect task completion status changes
	 */
	private async handleFileModification(file: TFile) {
		// Only process markdown files
		if (file.extension !== 'md') {
			return;
		}

		// Check if this is a task file we should process
		if (!this.isTaskFile(file)) {
			return;
		}

		try {
			// Read the file content
			const content = await this.app.vault.read(file);
			
			// Check for completion status in frontmatter
			const completionMatch = content.match(
				new RegExp(`${this.settings.completionProperty}:\\s*(true|false)`, 'i')
			);
			
			if (completionMatch) {
				const isCompleted = completionMatch[1].toLowerCase() === 'true';
				
				// Process the task completion
				await this.taskManager.processTaskCompletion(file, isCompleted);
			}
		} catch (error) {
			console.error('Error processing file modification:', error);
		}
	}

    /**
     * Check if a file is a task file that should be processed
     */
    private isTaskFile(file: TFile): boolean {
        // Check if the file is in the tasks directory or completed directory
        return (
            file.path.startsWith(this.settings.tasksDirectory) ||
            file.path.startsWith(this.settings.completedDirectory)
        );
    }

    /**
     * Mark the current task as completed
     */
    private async completeTask(file: TFile) {
        try {
            const content = await this.app.vault.read(file);
            
            // Check if the task is already completed
            const completionMatch = content.match(
                new RegExp(`${this.settings.completionProperty}:\\s*(true|false)`, 'i')
            );
            
            if (completionMatch && completionMatch[1].toLowerCase() === 'true') {
                // Task is already completed
                return;
            }
            
            // Process the task completion
            await this.taskManager.processTaskCompletion(file, true);
        } catch (error) {
            console.error('Error completing task:', error);
        }
    }

    /**
     * Mark the current task as incomplete
     */
    private async incompleteTask(file: TFile) {
        try {
            const content = await this.app.vault.read(file);
            
            // Check if the task is already incomplete
            const completionMatch = content.match(
                new RegExp(`${this.settings.completionProperty}:\\s*(true|false)`, 'i')
            );
            
            if (completionMatch && completionMatch[1].toLowerCase() === 'false') {
                // Task is already incomplete
                return;
            }
            
            // Process the task completion
            await this.taskManager.processTaskCompletion(file, false);
        } catch (error) {
            console.error('Error marking task as incomplete:', error);
        }
    }
}