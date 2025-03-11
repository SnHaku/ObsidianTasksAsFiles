// ui/missed-recurrences-modal.ts
import { App, Modal } from 'obsidian';

export class MissedRecurrencesModal extends Modal {
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