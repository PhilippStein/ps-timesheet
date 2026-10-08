# Spec Delta

## Purpose
Extends project configuration management to support customizable default notes and weekday-specific recurring notes in `~/.pstimesheet.yaml`.

## ADDED Requirements

### Requirement: Default Notes Configuration
The system SHALL support configuring a list of project-level default notes (`defaultNotes`) in `ProjectConfig`, representing general quick-add note templates.

#### Scenario: Parse and serialize default notes
- **WHEN** `~/.pstimesheet.yaml` contains `defaultNotes` with items like `["Daily", "Code Review"]`
- **THEN** the backend deserializes them into `ProjectConfig.defaultNotes` and preserves them upon saving

### Requirement: Recurring Notes Configuration by Weekday
The system SHALL support configuring recurring notes (`recurringNotes`) in `ProjectConfig`, each specifying a note text and an array of applicable weekdays.

#### Scenario: Parse recurring notes for specific days
- **WHEN** a project defines recurring notes such as text "SP Weekly" on "Mittwoch" and text "Daily" on ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"]
- **THEN** the configuration parser loads the recurring rules and associates them with the project

### Requirement: Project Dialog Configuration UI
The system SHALL provide UI inputs in `ProjectDialogComponent` to add, edit, and remove default notes and recurring note rules with day-of-week selectors.

#### Scenario: Edit recurring notes in project dialog
- **WHEN** a user opens the project edit dialog
- **THEN** they can view existing default notes and recurring notes, add new ones with target days of the week, and save the updated configuration
