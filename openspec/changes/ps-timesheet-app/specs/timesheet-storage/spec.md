# Spec Delta

## Purpose
Manages hierarchical file-system discovery, automatic folder/file initialization, and atomic CSV data persistence.

## ADDED Requirements

### Requirement: Scan Hierarchical Storage
The system SHALL scan configured project base paths for subdirectories matching 4-digit years (`<yyyy>`) and files matching `<yyyy>_<MM>_<projectName>_<templateName>.csv`.

#### Scenario: Discover existing years and months
- **WHEN** a project base path contains year directories with monthly CSV files
- **THEN** the system returns a structured tree of available years and months for that project

### Requirement: Auto-Create Missing Timesheet Structure
The system SHALL automatically create missing year directories and initialize empty month CSV files when navigating to an unrecorded month.

#### Scenario: Navigate to uninitialized month
- **WHEN** a user selects a project period that does not yet have a CSV file on disk
- **THEN** the year directory is created and a new CSV file pre-populated with all days of that calendar month (1..lastDay) is initialized

### Requirement: Atomic File Persistence
The system SHALL write timesheet updates using atomic file replacement to prevent data loss or file corruption during unexpected interruptions.

#### Scenario: Save timesheet data
- **WHEN** updated timesheet data is saved to disk
- **THEN** data is written to a temporary staging file and atomically renamed to the target CSV file path
