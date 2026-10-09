# Spec Delta

## Purpose
Specifies the PDF export capability for monthly timesheets, including OpenPDF document generation, typography and letterhead background management, layout rendering for `PersonDays` and `WorkHours` templates, and the REST export endpoint.

## ADDED Requirements

### Requirement: PDF Document Styling & Typography
The system SHALL generate A4 PDF documents using the "PT Sans" font family (bundled Regular and Bold TrueType fonts) with a base size of 11 pt.
- Table headers and total/summary rows SHALL be styled in 11 pt Bold.
- Table headers SHALL automatically repeat at the top of every subsequent page when a table spans across multiple pages (`headerRows = 1` or `2`).
- The bottom of each page SHALL display a footer with page numbering formatted as `Seite <aktuell>/<gesamt>` positioned within the bottom margin area.

#### Scenario: Multi-page document pagination
- **WHEN** a monthly timesheet spans across 2 pages
- **THEN** page 1 displays `Seite 1/2` and page 2 displays `Seite 2/2`
- **AND** the table headers are visible at the top of the content area on both page 1 and page 2

### Requirement: Stationery Template Background Overlay
The system SHALL support merging an external background letterhead PDF onto each exported page:
- When `templatePdfPath` is configured, each page of the generated PDF SHALL import and underlay page 1 of the template PDF behind the text and tables.
- The document content area SHALL respect the configured `marginTopMm`, `marginBottomMm`, `marginLeftMm`, and `marginRightMm` (converted to DTP points: `1 mm = 2.83465 pt`), ensuring content does not print over stationery header or footer graphics.

#### Scenario: Margins with template overlay
- **GIVEN** `marginTopMm` is configured as 35 mm and `marginBottomMm` as 25 mm
- **WHEN** the PDF is generated
- **THEN** table content starts below 35 mm from the top and stops above 25 mm from the bottom

### Requirement: PersonDays PDF Layout
The system SHALL render `PersonDays` monthly timesheets according to the "Leistungsschein" format:
- **Title**: A header above the table in 11 pt Bold stating `Leistungsschein <Monat> <Jahr>` (e.g., `Leistungsschein Oktober 2026`).
- **Table Columns & Widths**:
  1. `Datum`: formatted as two lines `Wochentag,\ndd.MM.yyyy` (e.g., `Montag,\n05.10.2026`).
  2. Dynamic task columns: `<Task 1>`, `<Task 2>`, ..., with PT values formatted as integers or minimal decimals (e.g., `1`, `0.5`, `0.75` without trailing zeros, blank if 0). Kept as compact / narrow as possible.
  3. `Tätigkeit`: Rendered as a structured bullet point list (`• <Item>`) parsing daily notes (supporting multiline notes and bullet markers), with allocated maximum width.
  4. `Ort`: Location (e.g., `Remote`, `Vor-Ort`, or status), kept as compact / narrow as possible.
- **Table Footer**:
  1. A sum row containing `Summe` and the sum of PTs for each task column.
  2. A total sum row below displaying `Gesamtzahl PT` and the total sum of all PTs for the month.
- **Closing Text**: If `pdfFooterText` is configured on the project, it SHALL be rendered below the table.

```
+-----------------------------------------------------------------------------------+
| BRIEFPAPIER HEADER-ZONE (Sperrbereich: marginTopMm)                               |
+-----------------------------------------------------------------------------------+

 Leistungsschein Oktober 2026

 +----------------+--------+--------+--------+-----------------------+--------------+
 | Datum          | Task 1 | Task 2 | Task 3 | Tätigkeit             | Ort          |
 +----------------+--------+--------+--------+-----------------------+--------------+
 | Montag,        | 1      |        |        | Konzeption PDF-Export | Remote       |
 | 05.10.2026     |        |        |        |                       |              |
 +----------------+--------+--------+--------+-----------------------+--------------+
 | Dienstag,      | 0.5    | 0.5    |        | Frontend & Backend    | Vor-Ort      |
 | 06.10.2026     |        |        |        | Integration           |              |
 +----------------+--------+--------+--------+-----------------------+--------------+
 | ...            | ...    | ...    | ...    | ...                   | ...          |
 +----------------+--------+--------+--------+-----------------------+--------------+
 | Summe          | 8      | 4.5    | 2      |                       |              |
 +----------------+--------+--------+--------+-----------------------+--------------+
 | Gesamtzahl PT  | 14.5                                                            |
 +----------------+-----------------------------------------------------------------+

 Projektbezogener Abschlusstext...

+-----------------------------------------------------------------------------------+
| BRIEFPAPIER FOOTER-ZONE (Sperrbereich: marginBottomMm)               Seite 1/1    |
+-----------------------------------------------------------------------------------+
```

#### Scenario: Rendering PersonDays table
- **WHEN** exporting a `PersonDays` timesheet with tasks "Concept" (8 PT) and "Dev" (4.5 PT)
- **THEN** the table footer displays `8` under Concept, `4.5` under Dev, and `12.5` in the `Gesamtzahl PT` row

### Requirement: WorkHours PDF Layout
The system SHALL render `WorkHours` monthly timesheets according to the structured working hours format:
- **Header Bar**: A 2-row table header with bold text and a light gray background (`#EEEEEE`):
  - Row 1: `<Monat> | <Jahr> | <Header-Text> | <Monatsende>` (where `<Header-Text>` is `ProjectConfig.pdfHeaderTitle` or `ProjectConfig.name`, and `<Monatsende>` is the last date of the month `dd.MM.yyyy`).
  - Row 2: `Datum | Start | Ende | Pause | Summe | Bemerkung`.
- **Row Filtering**: Weekend days (Saturday, Sunday) SHALL be omitted from the table if they contain no recorded start/end times, comments, or status.
- **Weekly & Monthly Subtotals**:
  - A summary row with `Summe | <hh:mm>` SHALL be inserted after each calendar week (Sunday or last logged day of the week), styled with bold text and a light gray background.
  - A summary row with `Monatssumme | <hh:mm>` SHALL be rendered at the end of the table, styled with bold text and a light gray background.
- **Statistics Summary Table**: Rendered below the main table with decimal values:
  - `Arbeitstage | <Anzahl Werktage Mo-Fr>`
  - `Sollstunden | <Arbeitstage * 8.00>` (formatted as decimal, e.g., `168.00`)
  - `Ist-Stunden | <Geleistete Gesamtstunden in Dezimal>` (e.g., `160.00`)
  - `Differenz | <Ist-Stunden - Sollstunden>` (e.g., `-8.00`)
  - `Urlaub | <Anzahl Tage mit Status 'Urlaub'>` (formatted as decimal, e.g., `1.0`)
- **Closing Text**: If `pdfFooterText` is configured on the project, it SHALL be rendered below the statistics table.

```
+-----------------------------------------------------------------------------------+
| BRIEFPAPIER HEADER-ZONE (Sperrbereich: marginTopMm)                               |
+-----------------------------------------------------------------------------------+

 +----------------------------------------------------------------------------------+
 | Oktober        | 2026   | Tätigkeitsnachweis Entwicklung | 31.10.2026            |
 +----------------+--------+--------+--------+--------------+-----------------------+
 | Datum          | Start  | Ende   | Pause  | Summe        | Bemerkung             |
 +----------------+--------+--------+--------+--------------+-----------------------+
 | 01.10.2026     | 08:00  | 16:30  | 00:30  | 08:00        | Backend Konzeption    |
 | 02.10.2026     | 08:30  | 17:00  | 00:30  | 08:00        | PDF-Generierung       |
 +----------------+--------+--------+--------+--------------+-----------------------+
 | Summe          |        |        |        | 16:00        |                       | <- Wochensumme (grau)
 +----------------+--------+--------+--------+--------------+-----------------------+
 | 05.10.2026     | 08:00  | 17:00  | 01:00  | 08:00        | Refactoring           |
 | 06.10.2026     |        |        |        |              | Urlaub                |
 | ...            | ...    | ...    | ...    | ...          | ...                   |
 +----------------+--------+--------+--------+--------------+-----------------------+
 | Monatssumme    |                          | 160:00       |                       | <- Monatssumme (grau)
 +----------------+--------------------------+--------------+-----------------------+

 Statistik:
 +---------------------------+------------------------+
 | Arbeitstage               | 21                     |
 | Sollstunden               | 168.00                 |
 | Ist-Stunden               | 160.00                 |
 | Differenz                 | -8.00                  |
 | Urlaub                    | 1.0                    |
 +---------------------------+------------------------+

 Leistung wie vereinbart erbracht.
 Zahlbar rein netto innerhalb von 14 Tagen.

+-----------------------------------------------------------------------------------+
| BRIEFPAPIER FOOTER-ZONE (Sperrbereich: marginBottomMm)               Seite 1/2    |
+-----------------------------------------------------------------------------------+
```

#### Scenario: WorkHours weekend filtering and weekly sums
- **GIVEN** a month where Saturday and Sunday have no logged times or notes
- **WHEN** the PDF is generated
- **THEN** Saturday and Sunday rows are omitted from the table
- **AND** a weekly sum row summarizing the Monday-Friday work hours is inserted with a light gray background

### Requirement: REST Export Endpoint & Frontend Action
The system SHALL provide a REST endpoint for generating and downloading timesheet PDFs:
- `GET /api/timesheets/{project}/{year}/{month}/pdf` returning MIME type `application/pdf` with `Content-Disposition: attachment; filename="Timesheet_<project>_<year>_<month>.pdf"`.
- The Angular frontend navigation toolbar SHALL provide an export button that initiates the download for the currently viewed project and month.

#### Scenario: Downloading PDF from frontend
- **WHEN** the user clicks "PDF Export" in the toolbar for project "Alpha" in October 2026
- **THEN** the browser downloads `Timesheet_Alpha_2026_10.pdf`
