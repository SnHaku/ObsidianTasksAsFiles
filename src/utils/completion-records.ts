// utils/completion-records.ts
import { moment } from 'obsidian';

/**
 * Adds a completion record to the note content
 * @param content - The current note content
 * @param datetime - The completion datetime
 * @param status - The completion status ('completed' or 'skipped')
 * @param heading - The heading text for the completion section
 * @param position - Where to place the completion section ('top' or 'bottom')
 * @param dateTimeFormat - The format for displaying dates
 * @param completedIndicator - The indicator for completed status
 * @param skippedIndicator - The indicator for skipped status
 * @returns Updated note content with the new completion record
 */
export function addCompletionRecord(
    content: string, 
    datetime: string, 
    status: string, 
    heading: string, 
    position: 'top' | 'bottom',
    dateTimeFormat: string,
    completedIndicator: string,
    skippedIndicator: string
): string {
    const headingRegex = new RegExp(`## ${heading}`);
    
    // Format the datetime according to settings
    const formattedDatetime = moment(datetime).format(dateTimeFormat);
    
    // Convert status to the configured indicator
    const statusIndicator = status === 'completed' ? completedIndicator : skippedIndicator;
    
    // New row to add
    const newRow = `| ${formattedDatetime} | ${statusIndicator} | 1 |`;
    
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
                const updatedRow = `| ${formattedDatetime} | ${statusIndicator} | ${highestCount + 1} |`;
                
                // Insert the new row right after the divider (without adding an extra newline)
                return content.substring(0, dividerEndPos) + updatedRow + '\n' + content.substring(dividerEndPos);
            } else {
                // No divider found - the table might be broken
                // Let's rebuild the table properly
                const newTable = `| Date | Status | # |
| ---- | ------ | - |
| ${formattedDatetime} | ${statusIndicator} | 1 |`;
                
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
| ${formattedDatetime} | ${statusIndicator} | 1 |`;
            
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
| ${formattedDatetime} | ${statusIndicator} | 1 |`;
        
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