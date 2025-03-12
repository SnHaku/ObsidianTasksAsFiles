# Tasks as Files

A plugin for Obsidian that treats individual notes as recurring tasks, allowing you to track completions while keeping the task active for future recurrences.

Intended to be used with the Templater plugin (or just Templates) for task creation and the Projects plugin for listing tasks, but it's not directly integrated with either. 

## Features

- **Note-Based Tasks**: Each task is a separate note with YAML frontmatter
- **Recurring Tasks**: Define recurrence patterns to repeat tasks
- **Completion Tracking**: Record each completion while keeping the task active
- **Flexible Recurrence**: Supports various recurrence patterns like daily, weekly, monthly
- **Completion History**: Maintains a record of all completions in a structured format
- **Missed Recurrences Handling**: Skips overdue tasks to avoid duplication

## Installation

### Manual Installation

1. Download the latest release from the [GitHub releases page](https://github.com/yourusername/obsidian-tasks-as-files/releases)
2. Extract the ZIP file into your Obsidian vault's `.obsidian/plugins` folder
3. Enable the plugin in Obsidian's Community Plugins settings

### From Obsidian Community Plugins 

This plugin is not available on Obsidian Community Plugins yet. 

## Usage

### Creating a Task

1. Create a new note with the following YAML frontmatter:

```yaml
---
Type: Task
Due: 2023-10-15
Recur: 1w
Done: false
---



The plugin will recognize this as a recurring task due on October 15, 2023, that repeats weekly.



Recurrence Format



The plugin supports both shorthand and longform formats:



Shorthand: 1d (daily), 2w (every 2 weeks), 3m (every 3 months), 1y (yearly)

Add c suffix for "after completion": 2dc (2 days after completion)

Longform: 1 day, 2 weeks, 3 months after completion



Completing a Task



When viewing a task note:



A "Complete Current Recurrence" button will appear

Clicking this button will:

Record the completion in a table at the bottom of the note

Update the due date based on the recurrence pattern

Keep the task active for future recurrences



Handling Missed Recurrences



If you miss a recurring task:



The plugin will detect missed recurrences

A dialog will ask if you want to mark them as "completed" or "skipped"

The task will be updated accordingly



Settings



The plugin offers various settings to customize its behavior:



Task Identification: Configure how tasks are identified

Recurrence: Customize recurrence properties and formats

Completion Records: Configure how completions are recorded

CompleteTime Management: Options for updating completion timestamps



Contributing


Warning for all who wander into the codebase: this project's codebase is nearly all written by LLM. Some design decisions may be suboptimal as a result. 

Contributions are welcome! Please feel free to submit a Pull Request or create an Issue on GitHub.



License



This project is licensed under the MIT License - see the LICENSE file for details.
