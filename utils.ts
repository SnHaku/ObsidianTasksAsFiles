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
    
    // Convert status to emoji
    const statusEmoji = status === 'completed' ? '✅' : '⏭️';
    
    // New row to add
    const newRow = `| ${formattedDatetime} | ${statusEmoji} | 1 |`;
    
    // Check if heading exists
    if (headingRegex.test(content)) {
        // Find the heading position
        const headingPos = content.search(headingRegex);
        const afterHeadingPos = content.indexOf('\n', headingPos) + 1;
        
        // Check if there's already a table after the heading
        const tableHeaderRegex = /\|\s*Date\s*\|\s*Status\s*\|\s*#\s*\|/;
        const tableHeaderMatch = content.substring(afterHeadingPos).match(tableHeaderRegex);
        
        if (tableHeaderMatch) {
            // Table exists - we need to find the divider row and the existing rows
            const tableStartPos = afterHeadingPos + content.substring(afterHeadingPos).search(tableHeaderRegex);
            const headerLineEndPos = content.indexOf('\n', tableStartPos) + 1;
            
            // Look for the divider row
            const dividerRegex = /\|\s*-+\s*\|\s*-+\s*\|\s*-+\s*\|/;
            const dividerMatch = content.substring(headerLineEndPos).match(dividerRegex);
            
            if (dividerMatch) {
                // Found the divider - insert after it
                const dividerPos = headerLineEndPos + content.substring(headerLineEndPos).search(dividerRegex);
                const dividerEndPos = content.indexOf('\n', dividerPos) + 1;
                
                // Find all existing rows to calculate the highest count
                const tableEndPos = content.indexOf('\n\n', dividerEndPos);
                const tableContent = tableEndPos > 0 
                    ? content.substring(dividerEndPos, tableEndPos) 
                    : content.substring(dividerEndPos);
                
                // Find the highest recurrence count
                const rowRegex = /\|\s*.*?\s*\|\s*.*?\s*\|\s*(\d+)\s*\|/g;
                let match;
                let highestCount = 0;
                
                while ((match = rowRegex.exec(tableContent)) !== null) {
                    const count = parseInt(match[1], 10);
                    if (count > highestCount) {
                        highestCount = count;
                    }
                }
                
                // Update the row with the incremented count
                const updatedRow = `| ${formattedDatetime} | ${statusEmoji} | ${highestCount + 1} |`;
                
                // Insert the new row right after the divider (without adding an extra newline)
                return content.substring(0, dividerEndPos) + updatedRow + '\n' + content.substring(dividerEndPos);
            } else {
                // No divider found - the table might be broken
                // Let's rebuild the table properly
                const newTable = `| Date | Status | # |
| ---- | ------ | - |
| ${formattedDatetime} | ${statusEmoji} | 1 |`;
                
                // Replace everything from the header line to the next blank line
                const tableEndPos = content.indexOf('\n\n', tableStartPos);
                if (tableEndPos > 0) {
                    return [
                        content.substring(0, tableStartPos),
                        newTable,
                        content.substring(tableEndPos)
                    ].join('');
                } else {
                    return [
                        content.substring(0, tableStartPos),
                        newTable
                    ].join('');
                }
            }
        } else {
            // No table exists yet - create one
            const newTable = `| Date | Status | # |
| ---- | ------ | - |
| ${formattedDatetime} | ${statusEmoji} | 1 |`;
            
            // Add the table after the heading
            return [
                content.substring(0, afterHeadingPos),
                newTable,
                content.substring(afterHeadingPos)
            ].join('\n');
        }
    } else {
        // No heading exists - create it with a new table
        const newContent = `## ${heading}
| Date | Status | # |
| ---- | ------ | - |
| ${formattedDatetime} | ${statusEmoji} | 1 |`;
        
        if (position === 'top') {
            // Add at the top after frontmatter
            const frontmatterEndIndex = content.indexOf('---\n') + 4;
            const secondFrontmatterEndIndex = content.indexOf('---\n', frontmatterEndIndex) + 4;
            
            return [
                content.substring(0, secondFrontmatterEndIndex),
                `\n\n${newContent}`,
                content.substring(secondFrontmatterEndIndex)
            ].join('');
        } else {
            // Add at the bottom
            return [
                content,
                `\n\n${newContent}`
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