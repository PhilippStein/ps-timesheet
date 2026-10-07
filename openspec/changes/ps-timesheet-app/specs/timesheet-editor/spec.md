# Spec Delta

## Purpose
Provides an interactive, high-throughput tabular timesheet editor with keyboard navigation and auto-save.

## ADDED Requirements

### Requirement: Interactive Timesheet Matrix & Auto-Save
The system SHALL render an editable table for all calendar days of the selected month, distinguish weekend days visually, and automatically save changes on blur / debounced change.

#### Scenario: Visual distinction for non-working days
- **WHEN** calendar days fall on Saturday or Sunday
- **THEN** rows are visually highlighted to clearly distinguish weekends from working days

#### Scenario: Debounced auto-save
- **WHEN** a user modifies a cell value or daily note
- **THEN** changes are debounced and saved automatically to the backend without requiring manual save button clicks

### Requirement: Inline Expanding Notes Editor
The system SHALL provide an inline expanding textarea for editing multiline bulletpoint notes per day row in Template 2.

#### Scenario: Dynamic expansion on focus
- **WHEN** a user focuses or edits a day's note cell
- **THEN** the textarea expands inline to accommodate multiline text and automatically prepends bullets on newline

### Requirement: Keyboard Navigation & Row Duplication
The system SHALL support spreadsheet-like keyboard traversal and full-row duplication via `Ctrl+D` / `Cmd+D`.

#### Scenario: Full-row duplication
- **WHEN** a user presses `Ctrl+D` or `Cmd+D` on a day row
- **THEN** all time entries, PT allocations, and daily bulletpoint notes from the previous day are copied into the active day

#### Scenario: Directional navigation traversal
- **WHEN** a user presses `Tab` or `Enter` in a grid cell
- **THEN** `Tab` navigates horizontally across columns and `Enter` commits the value and advances vertically to the next day
