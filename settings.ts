export interface RecurringTasksSettings {
    // Directory settings
    tasksDirectory: string;
    completedDirectory: string;
    
    // Frontmatter property names
    completionProperty: string;
    completionTimeProperty: string;
    recurrenceProperty: string;
    dueDateProperty: string;
    
    // Behavior settings
    createNewFileOnCompletion: boolean;
}

export const DEFAULT_SETTINGS: RecurringTasksSettings = {
    tasksDirectory: "Tasks",
    completedDirectory: "Tasks/Completed",
    
    completionProperty: "Completed",
    completionTimeProperty: "CompletedTime",
    recurrenceProperty: "Recurrence",
    dueDateProperty: "DueDate",
    
    createNewFileOnCompletion: true
};