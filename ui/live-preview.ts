// ui/live-preview.ts
import { EditorView, ViewPlugin, WidgetType, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
import { Plugin, TFile } from 'obsidian';
import { RecurrenceInfo } from '../recurrence-parser';

export function setupLivePreviewExtension(plugin: Plugin) {
    // Register the CodeMirror 6 extension
    plugin.registerEditorExtension([
        recurringTaskButtonPlugin(plugin)
    ]);
}

// Button widget that will be rendered in the editor
class RecurringTaskButtonWidget extends WidgetType {
    private plugin: Plugin;
    private file: TFile;
    private recurrence: RecurrenceInfo;

    constructor(plugin: Plugin, file: TFile, recurrence: RecurrenceInfo) {
        super();
        this.plugin = plugin;
        this.file = file;
        this.recurrence = recurrence;
    }

    toDOM() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'recurring-task-button-container';
        
        const button = document.createElement('button');
        button.textContent = 'Complete Current Recurrence';
        button.className = 'recurring-task-complete-button';
        
        button.addEventListener('click', async () => {
            // @ts-ignore - We'll call this method from the main plugin class
            await this.plugin.completeRecurrence(this.file, this.recurrence);
        });
        
        buttonContainer.appendChild(button);
        return buttonContainer;
    }
}

// CodeMirror ViewPlugin that manages the button decoration
function recurringTaskButtonPlugin(plugin: Plugin) {
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = Decoration.none;
            this.checkAndUpdateDecorations(view);
        }

        async checkAndUpdateDecorations(view: EditorView) {
            const file = plugin.app.workspace.getActiveFile();
            if (!file) return;

            try {
                // @ts-ignore - We'll call this method from the main plugin class
                const { isTask, recurrence, isDone } = await plugin.isTaskWithRecurrence(file);
                
                // Only show the button if it's a task with recurrence and not done
                if (isTask && recurrence && !isDone) {
                    // Find the end of frontmatter
                    const text = view.state.doc.toString();
                    const frontmatterEndPos = text.indexOf('---\n') + 4;
                    const secondFrontmatterEndPos = text.indexOf('---\n', frontmatterEndPos) + 4;
                    
                    if (secondFrontmatterEndPos > 4) {
                        // Create decoration at the end of frontmatter
                        const widget = Decoration.widget({
                            widget: new RecurringTaskButtonWidget(plugin, file, recurrence),
                            side: 1
                        });
                        
                        this.decorations = Decoration.set([widget.range(secondFrontmatterEndPos)]);
                    }
                } else {
                    this.decorations = Decoration.none;
                }
            } catch (error) {
                console.error("Error checking if file is a recurring task:", error);
                this.decorations = Decoration.none;
            }
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.checkAndUpdateDecorations(update.view);
            }
        }
    }, {
        decorations: v => v.decorations
    });
}