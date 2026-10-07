# Spec Delta

## Purpose
Provides OneNote-style multi-column navigation across projects, years, and months with rapid keyboard controls.

## ADDED Requirements

### Requirement: 3-Column Navigation Hierarchy
The system SHALL present a 3-column navigation panel displaying Projects in the first column, available Years in the second column, and available Months in the third column.

#### Scenario: Project selection loads current period
- **WHEN** a user clicks on a project
- **THEN** the system focuses that project, loads its recorded years, and automatically selects the current year and month

#### Scenario: Year selection updates available months
- **WHEN** a user selects a different year in the years column
- **THEN** the months column updates to display all months for which data exists or can be created

### Requirement: Navigation Quick Actions
The system SHALL provide `+ Projekt`, `+ Jahr`, and `+ Monat` buttons above their respective navigation columns to create or initialize periods immediately.

#### Scenario: Create project action
- **WHEN** a user clicks `+ Projekt`
- **THEN** a project dialog opens allowing configuration of project name, base path, template, and default tasks

#### Scenario: Add month action
- **WHEN** a user clicks `+ Monat`
- **THEN** an unrecorded month for the selected year is initialized and focused in the editor
