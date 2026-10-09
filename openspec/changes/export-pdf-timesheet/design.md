# Design

## Context
`ps-timesheet` allows users to track hours and person-days per month across different client projects. Users require an automated, one-click PDF export to generate printable timesheets and billing attachments ("Leistungsschein") featuring company letterhead background stationery, safe margin areas, unified PT Sans typography (11 pt), distinct template layouts (`PersonDays` and `WorkHours`), subtotal calculations, and monthly statistics.

## Goals / Non-Goals

**Goals:**
- Generate clean, professional A4 PDF exports directly from the Quarkus backend using OpenPDF.
- Support background stationery PDFs (`Briefpapier`) with configurable header/footer/side margins in millimeters.
- Embed PT Sans (Regular & Bold) TrueType fonts for cross-platform rendering consistency.
- Implement specialized layouts:
  - `PersonDays`: "Leistungsschein" format, dynamic task columns, compact PT formatting, column totals, total PT summary, and project footer notes.
  - `WorkHours`: Header box with project title & month end, filtered weekend rows, weekly & monthly subtotals highlighted in bold with light gray backgrounds, decimal statistics block (Arbeitstage, Sollstunden, Ist-Stunden, Differenz, Urlaub), and project footer notes.
- Automatically repeat table headers across page breaks and provide two-pass total page count footers ("Seite X/Y").
- Provide a dedicated REST endpoint `GET /api/timesheets/{project}/{year}/{month}/pdf` and an export action button in the Angular navigation toolbar.

**Non-Goals:**
- Interactive PDF form fields or digital cryptographic signatures.
- Graphical chart generation inside the PDF.
- Direct PDF-to-printer network spooling.

## Decisions

### 1. PDF Engine: OpenPDF (LibrePDF)
- **Decision**: Add `com.github.librepdf:openpdf` (v2.0.3+) to `backend/pom.xml`.
- **Rationale**: OpenPDF provides a robust, lightweight, and native Java API for `PdfPTable`, cell borders, cell background colors, header repetition (`setHeaderRows`), font registration, and background template importing (`PdfImportedPage`).
- **Alternatives Considered**: Apache PDFBox (more low-level, requires custom table calculation loops), JasperReports (heavyweight XML template overhead).

### 2. Page Template Overlay & Dynamic Pagination
- **Decision**: Implement a custom `PdfPageEventHelper`:
  - `onEndPage`: 
    - If `templatePdfPath` is configured, read page 1 of the template with `PdfReader` and write it to `writer.getDirectContentUnder().addTemplate(importedPage, 0, 0)`.
    - Render the footer string `Seite <current>/` and write the deferred total page placeholder `PdfTemplate` into the margin footer area using `ColumnText`.
  - `onCloseDocument`: Fill in the total page count into the `PdfTemplate`.
- **Rationale**: Isolates page-level stationery and pagination logic from table-flow rendering, ensuring consistent appearance regardless of whether the document is 1 page or multiple pages.

### 3. Margin & Safe Area Calculations
- **Decision**: Convert millimeter config values to DTP points: `points = mm * (72.0 / 25.4) ≈ mm * 2.83465`.
- **Document Boundary**:
  ```java
  float marginLeft = (float) (config.getLeftMarginMm() * 2.83465f);
  float marginRight = (float) (config.getRightMarginMm() * 2.83465f);
  float marginTop = (float) (config.getTopMarginMm() * 2.83465f);
  float marginBottom = (float) (config.getBottomMarginMm() * 2.83465f);
  Document document = new Document(PageSize.A4, marginLeft, marginRight, marginTop, marginBottom);
  ```
- **Rationale**: Protects letterhead headers and footers from text collisions.

### 4. Font Management
- **Decision**: Embed `PTSans-Regular.ttf` and `PTSans-Bold.ttf` under `backend/src/main/resources/fonts/` and register them via `FontFactory.register()`.
- **Standard Sizes**: Base size 11 pt for document text, table headers, and titles.

### 5. Layout Rendering Architecture

```
+-----------------------------------------------------------------------------------+
|                             PDF EXPORT ARCHITECTURE                               |
+-----------------------------------------------------------------------------------+

 TimesheetExportResource (REST: GET /api/timesheets/{project}/{year}/{month}/pdf)
   |
   +--> PdfExportService
          |
          +--> PdfPageTemplateHelper (Background PDF Overlay + "Seite X/Y" Footer)
          |
          +--> PersonDaysPdfRenderer (Leistungsschein Layout)
          |      - Header: "Leistungsschein <Monat> <Jahr>"
          |      - Table: Datum (Wochentag,\ndd.MM.yyyy), Tasks (PTs), Tätigkeit, Ort
          |      - Footers: Task Sums, Gesamtzahl PT
          |      - Project Footer Text
          |
          +--> WorkHoursPdfRenderer (Structured WorkHours Layout)
                 - Header Bar: <Monat> | <Jahr> | <Header-Text> | <Monatsende>
                 - Table: Datum, Start, Ende, Pause, Summe, Bemerkung
                 - Weekend filter (omit empty Sat/Sun)
                 - Weekly & Monthly Sums (Bold, Gray #EEEEEE)
                 - Statistics Summary: Arbeitstage, Sollstunden, Ist, Diff, Urlaub
                 - Project Footer Text
```

### 6. Statistics Calculation for WorkHours
- **Decision**: Calculate metrics in `WorkHoursPdfRenderer`:
  - `Arbeitstage`: Count of Monday–Friday days in the month (excluding weekends).
  - `Sollstunden`: `Arbeitstage * 8.00` (e.g., `168.00`).
  - `Ist-Stunden`: Sum of duration of all recorded entries converted to decimal hours (e.g., `160.00`).
  - `Differenz`: `Ist-Stunden - Sollstunden` (e.g., `-8.00` or `+4.50`).
  - `Urlaub`: Count of days where `status` equals "Urlaub" (formatted as decimal, e.g., `1.0`).

### 7. Stationery Validation
- **Decision**: In `PdfExportService`, when `templatePdfPath` is not blank, resolve the path (expanding `~` if present) and check `Files.isRegularFile() && Files.isReadable()`. If invalid, throw `BadRequestException("Briefpapier-Vorlage unter '" + path + "' wurde nicht gefunden.")`. If null or blank, skip overlay and render on default white canvas.

## Risks / Trade-offs

- **[Multi-Page Table Header Alignment]** → OpenPDF `PdfPTable.setHeaderRows(1)` or `(2)` ensures headers repeat on page breaks. Explicit column widths (`setWidths`) will be set in percentage ratios to prevent overflow.
- **[Font Bundling in Quarkus Native / JVM]** → Loading TTF fonts as classloader resources (`getResourceAsStream`) ensures compatibility in standard JVM and packaged JAR execution.
