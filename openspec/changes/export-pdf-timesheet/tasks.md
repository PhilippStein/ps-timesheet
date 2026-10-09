# Tasks

## 1. Backend Dependencies, Fonts & Configuration Model

- [x] 1.1 Add `com.github.librepdf:openpdf` dependency to `backend/pom.xml`.
- [x] 1.2 Bundle PT Sans TrueType fonts (`PTSans-Regular.ttf`, `PTSans-Bold.ttf`) under `backend/src/main/resources/fonts/`.
- [x] 1.3 Create `PdfExportConfig.java` and update `AppConfig.java` to support `templatePdfPath`, `marginTopMm`, `marginBottomMm`, `marginLeftMm`, and `marginRightMm`.
- [x] 1.4 Update `ProjectConfig.java` to support `pdfHeaderTitle` and `pdfFooterText`.
- [x] 1.5 Add unit tests for `PdfExportConfig` YAML parsing, default values, and `ProjectConfig` fields.

## 2. Core PDF Engine & Page Event Helper

- [x] 2.1 Implement `PdfFontService` for registering and resolving PT Sans 11pt Regular and Bold fonts.
- [x] 2.2 Implement `PdfPageTemplateHelper` extending `PdfPageEventHelper` to render imported template PDF pages under content and generate two-pass "Seite X/Y" footers.
- [x] 2.3 Implement stationery path validation and error handling (failing with clear error if `templatePdfPath` is set but not found).

## 3. Template Layout Renderers

- [x] 3.1 Implement `PersonDaysPdfRenderer` for "Leistungsschein" layout (11pt bold title, `Wochentag,\ndd.MM.yyyy` date formatting, dynamic task columns with compact decimals, column sum row, total PT row, and project footer).
- [x] 3.2 Implement `WorkHoursPdfRenderer` for structured work hours layout (header bar, weekend row filtering, weekly and monthly sum rows with gray highlight `#EEEEEE`, decimal statistics summary table, and project footer).
- [x] 3.3 Implement `PdfExportService` managing document lifecycle, margins in mm/pt, template dispatch, and byte stream generation.

## 4. REST API Endpoint

- [x] 4.1 Create `TimesheetExportResource.java` exposing `GET /api/timesheets/{project}/{year}/{month}/pdf` producing `application/pdf` with `Content-Disposition`.
- [x] 4.2 Add unit and integration tests verifying PDF generation for both templates and HTTP 400 when stationery is missing.

## 5. Frontend UI & PDF Export Action

- [x] 5.1 Update `project.model.ts` with `PdfExportConfig`, `pdfHeaderTitle`, and `pdfFooterText`.
- [x] 5.2 Add `downloadPdf(project, year, month)` in `TimesheetApiService`.
- [x] 5.3 Add "PDF Export" button and download trigger in `TimesheetNavigationComponent`.
- [x] 5.4 Update `SettingsDialogComponent` and `ProjectDialogComponent` with input fields for stationery path, margins, header title, and footer text.

## 6. Verification & End-to-End Validation

- [x] 6.1 Execute backend test suite (`mvn test`) and verify all PDF rendering tests pass.
- [x] 6.2 Execute frontend test suite (`npm test`) and verify component interactions.
- [x] 6.3 Verify end-to-end build (`mvn clean package`) and validate sample generated PDF files.
