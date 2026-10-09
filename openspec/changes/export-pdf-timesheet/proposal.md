# Proposal: Monthly Timesheet PDF Export

## Why
Users need to generate clean, printable, and official PDF documents from their monthly timesheets for invoicing, client sign-offs, and compliance records. To align with corporate branding and official stationery, the system needs to support a configurable PDF background template (letterhead/Briefpapier) while respecting designated header and footer safe areas (margins).

Furthermore, each timesheet template (`PersonDays` and `WorkHours`) has distinct reporting and layout requirements:
- `PersonDays` reports require a "Leistungsschein" format with dynamic task columns, compact person-day number formatting, dual-level footer totals, and multiline activity descriptions.
- `WorkHours` reports require structured monthly tables with weekday filtering, weekly and monthly sum rows highlighted in bold with light gray backgrounds, and a decimal-based monthly work statistics summary block (working days, target hours, actual hours, difference, vacation).

Providing direct PDF export within `ps-timesheet` eliminates tedious manual copy-pasting into external templates, prevents calculation errors, and delivers ready-to-sign documents in one click.

## What Changes
- **Global & Project Configuration**:
  - Global `pdfExport` settings in `~/.pstimesheet.yaml`: `templatePdfPath` (optional background letterhead PDF; fails with clear error if specified path does not exist), and margin boundaries in mm (`marginTopMm`, `marginBottomMm`, `marginLeftMm`, `marginRightMm`) protecting header/footer letterhead zones.
  - Project-level settings: `pdfHeaderTitle` (configurable title in WorkHours header bar, falling back to project name), `pdfFooterText` (configurable multiline closing text / signature placeholder).
- **Backend PDF Generation Service**:
  - Integrate OpenPDF (`com.github.librepdf:openpdf`) and bundle embedded "PT Sans" fonts (Regular and Bold, 11pt default font size).
  - Implement `PdfExportService` supporting template overlay per page, automatic table header repetition across page breaks, and dynamic footer pagination ("Seite X/Y").
  - Implement specialized layout renderers for `PersonDays` (Leistungsschein layout, formatted dates as `Wochentag,\ndd.MM.yyyy`, dynamic task columns with compact decimals, column sums, and total PT row) and `WorkHours` (header block, weekend filtering, weekly & monthly sums with gray highlight, decimal statistics summary).
- **REST API Endpoint**:
  - Provide `GET /api/timesheets/{project}/{year}/{month}/pdf` producing `application/pdf` with `Content-Disposition` header for filename download.
- **Frontend Integration**:
  - Add an export button in the navigation / timesheet toolbar to trigger the PDF download.
  - Expose PDF export settings in the settings and project configuration dialogs.

## Capabilities

### Modified Capabilities
- `configuration`: Added `PdfExportConfig` to `AppConfig` (global margins and letterhead path) and `pdfHeaderTitle` / `pdfFooterText` to `ProjectConfig`.

### Added Capabilities
- `timesheet-export`: Provides backend PDF generation, letterhead merging, font embedding (PT Sans), specialized `PersonDays` and `WorkHours` layout rendering, and REST endpoint for downloading monthly PDF reports.

## Impact
- **Backend**: Adds OpenPDF dependency in `pom.xml`, new models in `de.phstein.timesheet.config`, new `PdfExportService` and `TimesheetExportResource`.
- **Frontend**: Adds PDF download action in `timesheet-navigation.component` and API service, and updates config dialogs.
- **Persistence**: Non-breaking additions to `~/.pstimesheet.yaml`. Timesheet CSV data files remain completely untouched.
