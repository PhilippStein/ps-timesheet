# Spec Delta: Timesheet Navigation Statistics Integration

## Purpose
Specifies the integration of statistics navigation buttons in the year and month column footers, and view switching in `TimesheetStateService`.

## ADDED Requirements

### Requirement: Statistics Footer Buttons in Navigation Columns
The timesheet navigation component SHALL provide footer buttons to switch into statistics views:
1. **Year Column Footer**: A button `[ 📊 Gesamtübersicht ]` that activates the all-time statistics view (`activeView = 'project-stats'`).
2. **Month Column Footer**: A button `[ 📊 Jahresübersicht ]` that activates the annual statistics view for the currently selected year (`activeView = 'year-stats'`).

#### Scenario: Opening Jahresübersicht
- **GIVEN** a selected project and year (e.g. `2026`)
- **WHEN** the user clicks `[ 📊 Jahresübersicht ]` in the month column footer
- **THEN** `TimesheetStateService.activeView` is set to `'year-stats'`, month selection in the column is deselected, and `ProjectStatsComponent` is rendered in the workspace for year 2026.

#### Scenario: Opening Gesamtübersicht
- **GIVEN** a selected project
- **WHEN** the user clicks `[ 📊 Gesamtübersicht ]` in the year column footer
- **THEN** `TimesheetStateService.activeView` is set to `'project-stats'`, year and month selections are deselected, and `ProjectStatsComponent` is rendered in the workspace for all years.

#### Scenario: Switching back to Month Editor
- **GIVEN** the user is viewing `year-stats` or `project-stats`
- **WHEN** the user selects a specific month in the navigation
- **THEN** `TimesheetStateService.activeView` is reset to `'month-editor'` and the timesheet editor component is rendered.
