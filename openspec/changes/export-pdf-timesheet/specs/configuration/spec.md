# Spec Delta

## Purpose
Extends global and project configuration models to support PDF export stationery (letterhead background template path), customizable margins for header/footer protection, custom project header titles, and configurable footer text.

## ADDED Requirements

### Requirement: Global PDF Export Configuration
The system SHALL support configuring global PDF export parameters in `AppConfig` (`~/.pstimesheet.yaml`) under the `pdfExport` object:
- `templatePdfPath` (String, optional): Absolute or home-relative path to a background letterhead PDF file.
- `marginTopMm` (Double, optional, default: 20.0): Top margin in millimeters defining the content boundary below the letterhead header zone.
- `marginBottomMm` (Double, optional, default: 20.0): Bottom margin in millimeters defining the content boundary above the letterhead footer zone.
- `marginLeftMm` (Double, optional, default: 15.0): Left margin in millimeters.
- `marginRightMm` (Double, optional, default: 15.0): Right margin in millimeters.

#### Scenario: Validating background template existence
- **GIVEN** `templatePdfPath` is configured with a non-blank path
- **WHEN** the PDF export service attempts to load the template
- **AND** the file at `templatePdfPath` does not exist or is not readable
- **THEN** the system SHALL reject the export with a clear validation error (e.g., HTTP 400 with a message stating the file was not found)

#### Scenario: Unset background template
- **GIVEN** `templatePdfPath` is not set or empty
- **WHEN** PDF export is requested
- **THEN** the system SHALL proceed with rendering using a standard white background without attempting to load an external template file

### Requirement: Project-Level PDF Configuration
The system SHALL support project-specific PDF configuration attributes in `ProjectConfig`:
- `pdfHeaderTitle` (String, optional): Title to display in the header bar of `WorkHours` exports (falls back to `ProjectConfig.name` if unset).
- `pdfFooterText` (String, optional): Multi-line text printed after the timesheet tables and statistics (e.g. signature fields, terms, or notes).

#### Scenario: Fallback for header title
- **GIVEN** `pdfHeaderTitle` is null or empty in `ProjectConfig`
- **WHEN** exporting a `WorkHours` timesheet
- **THEN** the system SHALL use `ProjectConfig.name` as the title in the header bar
