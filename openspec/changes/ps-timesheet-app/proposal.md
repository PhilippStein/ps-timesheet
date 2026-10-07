# Proposal

## Why
Users need a lightweight, local-first time tracking tool with zero operational friction, storing data in transparent human-readable CSV files organized by project, year, and month. By eliminating external database dependencies and complex cloud sync, PS-Timesheet maximizes speed, privacy, and personal productivity.

## What Changes
- **Configuration Management**: Central YAML configuration in `~/.pstimesheet.yaml` managing project base paths, templates, and task defaults.
- **Hierarchical Storage Engine**: Scanning and persisting records under `<basePath>/<yyyy>/<yyyy>_<MM>_<projectName>_<templateName>.csv` with atomic file operations.
- **Template 1 Engine**: Daily tracking of start time, end time, pause minutes, and comments, with dynamic on-the-fly calculation of net hours.
- **Template 2 Engine**: Daily tracking of person-days (PT) across dynamic monthly task columns and inline expandable daily bulletpoint notes, with dynamic total PT calculation.
- **OneNote-Style Navigation**: 3-column navigation for Projects, Years, and Months with auto-navigation to the current month and auto-creation of missing directories/CSVs.
- **Keyboard-Centric UI**: Full keyboard navigation, `Tab`/`Enter` traversal, and full-row duplication via `Ctrl+D` / `Cmd+D`.

## Capabilities

### New Capabilities
- `configuration`: Loading, parsing, updating, and writing `~/.pstimesheet.yaml`.
- `timesheet-storage`: Directory scanning, auto-initialization of year folders and month CSVs, and atomic CSV file persistence.
- `timesheet-templates`: Template 1 (Time/Pause) and Template 2 (PT/Dynamic Tasks/Daily Notes) processing and dynamic sum calculation.
- `timesheet-navigation`: OneNote-style 3-column UI hierarchy and state management.
- `timesheet-editor`: Grid-based timesheet matrix with inline expanding notes, keyboard shortcuts (`Ctrl+D`, `Tab`, `Enter`), and debounced auto-save.

### Modified Capabilities
<!-- None -->

## Impact
- New Quarkus backend service (Java 25, package `de.phstein.timesheet`).
- New Angular frontend (Angular 22, Angular Material, Standalone Components).
- Local filesystem access for `~/.pstimesheet.yaml` and project data folders.
