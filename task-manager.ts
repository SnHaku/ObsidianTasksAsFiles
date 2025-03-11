import { App, TFile, TFolder, Vault, moment } from "obsidian";
import { RecurringTasksSettings } from "./settings";
import { RecurrencePattern, calculateNextOccurrence, parseRecurrencePattern } from "./recurrence";

export class TaskManager {
    private app: App;
    private settings: RecurringTasksSettings;
    private vault: Vault;

    constructor(app: App, settings: RecurringTasksSettings) {
        this.app = app;
        this.settings = settings;
        this.vault = app.vault;
    }

    /**
     * Process a task completion event
     */
    public async processTaskCompletion(file: TFile, isCompleted: boolean): Promise<void> {
        try {
            // Read the file content
            const content = await this.vault.read(file);
            
            // Parse frontmatter and body
            const { frontmatter, body } = this.parseFrontmatter(content);
            
            // Check if the completion status has changed
            const wasCompleted = frontmatter[this.settings.completionProperty] === true;
            
            if (isCompleted && !wasCompleted) {
                // Task was just completed
                console.log(`Task completed: ${file.path}`);
                
                // Update completion time
                frontmatter[this.settings.completionProperty] = true;
                frontmatter[this.settings.completionTimeProperty] = moment().toISOString();
                
                // Check for recurrence pattern
                const recurrenceStr = frontmatter[this.settings.recurrenceProperty];
                if (recurrenceStr) {
                    const recurrencePattern = parseRecurrencePattern(recurrenceStr);
                    if (recurrencePattern) {
                        // Handle recurring task
                        await this.handleRecurringTask(file, frontmatter, body, recurrencePattern);
                        return;
                    }
                }
                
                // Non-recurring task - move to completed folder
                await this.moveToCompletedFolder(file, frontmatter, body);
            } else if (!isCompleted && wasCompleted) {
                // Task was marked as incomplete
                console.log(`Task marked incomplete: ${file.path}`);
                
                // Update frontmatter
                frontmatter[this.settings.completionProperty] = false;
                delete frontmatter[this.settings.completionTimeProperty];
                
                // Update the file
                await this.updateTaskFile(file, frontmatter, body);
            }
        } catch (error) {
            console.error("Error processing task completion:", error);
        }
    }

    /**
     * Handle a recurring task that has been completed
     */
    private async handleRecurringTask(
        file: TFile, 
        frontmatter: any, 
        body: string, 
        recurrencePattern: RecurrencePattern
    ): Promise<void> {
        // Get the current due date
        const dueDateStr = frontmatter[this.settings.dueDateProperty];
        if (!dueDateStr) {
            // Can't calculate next occurrence without a due date
            await this.moveToCompletedFolder(file, frontmatter, body);
            return;
        }
        
        const dueDate = moment(dueDateStr);
        const completionDate = moment(frontmatter[this.settings.completionTimeProperty]);
        
        // Calculate the next occurrence
        const nextDueDate = calculateNextOccurrence(recurrencePattern, dueDate, completionDate);
        
        // Create a copy in the completed folder with the due date appended to the filename
        const completedBaseName = `${file.basename.replace(/\.md$/, '')} ${dueDateStr}`;
        await this.copyToCompletedFolder(file, frontmatter, body, completedBaseName);
        
        // Update the original task with the next due date
        frontmatter[this.settings.dueDateProperty] = nextDueDate.format("YYYY-MM-DD");
        frontmatter[this.settings.completionProperty] = false;
        delete frontmatter[this.settings.completionTimeProperty];
        
        await this.updateTaskFile(file, frontmatter, body);
    }

    /**
     * Copy a task to the completed folder with a custom basename
     */
    private async copyToCompletedFolder(
        file: TFile, 
        frontmatter: any, 
        body: string, 
        customBaseName?: string
    ): Promise<TFile | null> {
        try {
            // Ensure the completed folder exists
            await this.ensureFolder(this.settings.completedDirectory);
            
            // Use custom basename if provided, otherwise use the original
            const baseName = customBaseName || file.basename.replace(/\.md$/, '');
            
            // Create the file path
            const filePath = `${this.settings.completedDirectory}/${baseName}.md`;
            
            // Check if a file with the same name already exists
            const existingFile = this.app.vault.getAbstractFileByPath(filePath);
            if (existingFile) {
                // Append a timestamp to make the filename unique
                const timestamp = moment().format("YYYYMMDD-HHmmss");
                const uniquePath = `${this.settings.completedDirectory}/${baseName}-${timestamp}.md`;
                
                // Create the file with frontmatter and body
                const content = this.stringifyFrontmatter(frontmatter, body);
                return await this.vault.create(uniquePath, content);
            } else {
                // Create the file with frontmatter and body
                const content = this.stringifyFrontmatter(frontmatter, body);
                return await this.vault.create(filePath, content);
            }
        } catch (error) {
            console.error("Error copying task to completed folder:", error);
            return null;
        }
    }

    /**
     * Move a task file to the completed folder
     */
    private async moveToCompletedFolder(file: TFile, frontmatter: any, body: string): Promise<void> {
        // Ensure the completed folder exists
        await this.ensureFolder(this.settings.completedDirectory);
        
        // Create the new path
        const newPath = `${this.settings.completedDirectory}/${file.name}`;
        
        // Check if a file with the same name already exists in the completed folder
        const existingFile = this.app.vault.getAbstractFileByPath(newPath);
        if (existingFile) {
            // Append a timestamp to make the filename unique
            const timestamp = moment().format("YYYYMMDD-HHmmss");
            const newName = `${file.basename}-${timestamp}${file.extension}`;
            const uniquePath = `${this.settings.completedDirectory}/${newName}`;
            
            // Update the file content and create at the new location
            await this.updateTaskFile(file, frontmatter, body);
            await this.vault.rename(file, uniquePath);
        } else {
            // Update the file content and move it
            await this.updateTaskFile(file, frontmatter, body);
            await this.vault.rename(file, newPath);
        }
    }

    /**
     * Move a task file back to the tasks folder
     */
    private async moveToTasksFolder(file: TFile, frontmatter: any, body: string): Promise<void> {
        // Ensure the tasks folder exists
        await this.ensureFolder(this.settings.tasksDirectory);
        
        // Create the new path
        const newPath = `${this.settings.tasksDirectory}/${file.name}`;
        
        // Check if a file with the same name already exists in the tasks folder
        const existingFile = this.app.vault.getAbstractFileByPath(newPath);
        if (existingFile) {
            // Append a timestamp to make the filename unique
            const timestamp = moment().format("YYYYMMDD-HHmmss");
            const newName = `${file.basename}-${timestamp}${file.extension}`;
            const uniquePath = `${this.settings.tasksDirectory}/${newName}`;
            
            // Update the file content and create at the new location
            await this.updateTaskFile(file, frontmatter, body);
            await this.vault.rename(file, uniquePath);
        } else {
            // Update the file content and move it
            await this.updateTaskFile(file, frontmatter, body);
            await this.vault.rename(file, newPath);
        }
    }

    /**
     * Create a new task file
     */
    private async createNewTaskFile(baseName: string, frontmatter: any, body: string): Promise<TFile> {
        // Ensure the tasks folder exists
        await this.ensureFolder(this.settings.tasksDirectory);
        
        // Remove .md extension from basename if it exists
        const cleanBaseName = baseName.endsWith('.md') 
            ? baseName.substring(0, baseName.length - 3) 
            : baseName;
        
        // Create the file path
        const filePath = `${this.settings.tasksDirectory}/${cleanBaseName}.md`;
        
        // Check if a file with the same name already exists
        const existingFile = this.app.vault.getAbstractFileByPath(filePath);
        if (existingFile) {
            // Append a timestamp to make the filename unique
            const timestamp = moment().format("YYYYMMDD-HHmmss");
            const uniquePath = `${this.settings.tasksDirectory}/${cleanBaseName}-${timestamp}.md`;
            
            // Create the file with frontmatter and body
            const content = this.stringifyFrontmatter(frontmatter, body);
            return await this.vault.create(uniquePath, content);
        } else {
            // Create the file with frontmatter and body
            const content = this.stringifyFrontmatter(frontmatter, body);
            return await this.vault.create(filePath, content);
        }
    }

    /**
     * Update an existing task file
     */
    private async updateTaskFile(file: TFile, frontmatter: any, body: string): Promise<void> {
        const content = this.stringifyFrontmatter(frontmatter, body);
        await this.vault.modify(file, content);
    }

    /**
     * Check if a file is in the completed folder
     */
    private isInCompletedFolder(file: TFile): boolean {
        return file.path.startsWith(this.settings.completedDirectory);
    }

    /**
     * Ensure a folder exists, creating it if necessary
     */
    private async ensureFolder(path: string): Promise<TFolder> {
        const folderExists = this.app.vault.getAbstractFileByPath(path) instanceof TFolder;
        
        if (!folderExists) {
            await this.vault.createFolder(path);
        }
        
        return this.app.vault.getAbstractFileByPath(path) as TFolder;
    }

    /**
     * Parse frontmatter from file content
     */
    private parseFrontmatter(content: string): { frontmatter: any, body: string } {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);
        
        if (match) {
            try {
                // Parse YAML frontmatter
                const yamlText = match[1];
                const body = match[2];
                
                // Simple YAML parsing (for a more robust solution, use a YAML library)
                const frontmatter: any = {};
                const lines = yamlText.split('\n');
                
                for (const line of lines) {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0) {
                        const key = line.substring(0, colonIndex).trim();
                        let value = line.substring(colonIndex + 1).trim();
                        
                        // Handle different value types
                        if (value === 'true') {
                            frontmatter[key] = true;
                        } else if (value === 'false') {
                            frontmatter[key] = false;
                        } else if (/^-?\d+(\.\d+)?$/.test(value) && !isNaN(Number(value))) {
                            // Only convert to number if it's a pure number (no letters)
                            frontmatter[key] = Number(value);
                        } else {
                            // Remove quotes if present
                            if ((value.startsWith('"') && value.endsWith('"')) || 
                                (value.startsWith("'") && value.endsWith("'"))) {
                                frontmatter[key] = value.substring(1, value.length - 1);
                            } else {
                                frontmatter[key] = value;
                            }
                        }
                    }
                }
                
                return { frontmatter, body };
            } catch (e) {
                console.error("Error parsing frontmatter:", e);
                return { frontmatter: {}, body: content };
            }
        }
        
        // No frontmatter found
        return { frontmatter: {}, body: content };
    }

    /**
     * Convert frontmatter and body to a string
     */
    private stringifyFrontmatter(frontmatter: any, body: string): string {
        // Convert frontmatter to YAML
        let yamlLines: string[] = [];
        
        for (const key in frontmatter) {
            const value = frontmatter[key];
            
            if (value === null || value === undefined) {
                continue;
            }
            
            if (typeof value === 'string') {
                // Check if we need to quote the string
                if (value.includes('\n') || value.includes(':') || value.includes('#') || 
                    value.startsWith(' ') || value.endsWith(' ') || value === '') {
                    yamlLines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
                } else {
                    yamlLines.push(`${key}: ${value}`);
                }
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                yamlLines.push(`${key}: ${value}`);
            } else {
                // For complex objects, convert to JSON string
                yamlLines.push(`${key}: "${JSON.stringify(value).replace(/"/g, '\\"')}"`);
            }
        }
        
        // Combine frontmatter and body
        if (yamlLines.length > 0) {
            return `---\n${yamlLines.join('\n')}\n---\n${body}`;
        } else {
            return body;
        }
    }
}