// utils.ts
import { moment } from 'obsidian';

export function updateFrontmatterProperty(content: string, property: string, value: string): string {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = frontmatterRegex.exec(content);
    
    if (!match) return content;
    
    const frontmatter = match[1];
    const propertyRegex = new RegExp(`(^|\\n)${property}:.*?(\\n|$)`, 'g');
    
    if (propertyRegex.test(frontmatter)) {
        // Update existing property
        const updatedFrontmatter = frontmatter.replace(
            propertyRegex, 
            `$1${property}: ${value}$2`
        );
        return content.replace(frontmatterRegex, `---\n${updatedFrontmatter}\n---`);
    } else {
        // Add new property
        const updatedFrontmatter = `${frontmatter}\n${property}: ${value}`;
        return content.replace(frontmatterRegex, `---\n${updatedFrontmatter}\n---`);
    }
}

export function addCompletionRecord(
    content: string, 
    datetime: string, 
    status: string, 
    heading: string, 
    position: 'top' | 'bottom',
    dateTimeFormat: string
): string {
    const headingRegex = new RegExp(`## ${heading}`);
    
    // Format the datetime according to settings
    const formattedDatetime = moment(datetime).format(dateTimeFormat);
    
    // Create the completion record
    const record = `- ${formattedDatetime}: ${status}`;
    
    if (headingRegex.test(content)) {
        // Section exists, add record after heading
        return content.replace(
            headingRegex,
            `## ${heading}\n${record}`
        );
    } else {
        // Section doesn't exist, create it
        if (position === 'top') {
            // Add at the top after frontmatter
            const frontmatterEndIndex = content.indexOf('---\n') + 4;
            const secondFrontmatterEndIndex = content.indexOf('---\n', frontmatterEndIndex) + 4;
            
            return [
                content.substring(0, secondFrontmatterEndIndex),
                `\n\n## ${heading}\n${record}`,
                content.substring(secondFrontmatterEndIndex)
            ].join('');
        } else {
            // Add at the bottom
            return [
                content,
                `\n\n## ${heading}\n${record}`
            ].join('');
        }
    }
}

export function isNoteATask(frontmatter: any, taskTypeProperty: string, taskTypeValue: string): boolean {
    if (!frontmatter || !taskTypeProperty || !taskTypeValue) return false;
    
    const propertyValue = frontmatter[taskTypeProperty];
    
    if (propertyValue === undefined) return false;
    
    // Case 1: Direct equality for string values
    if (propertyValue === taskTypeValue) return true;
    
    // Case 2: Array includes the value
    if (Array.isArray(propertyValue) && propertyValue.includes(taskTypeValue)) return true;
    
    return false;
}