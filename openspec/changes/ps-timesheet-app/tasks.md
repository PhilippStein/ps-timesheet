# Tasks

## 1. Backend Foundation & Configuration Layer

- [ ] 1.1 Initialize Quarkus 3.40.0 application with Java 25, base package `de.phstein.timesheet`, and required dependencies (`quarkus-rest-jackson`, `jackson-dataformat-yaml`, `commons-csv`).
- [ ] 1.2 Implement `AppConfigService` to locate, load, and persist `~/.pstimesheet.yaml` (with default template creation and env overrides).
- [ ] 1.3 Implement project configuration REST endpoints (`GET /api/config`, `GET /api/projects`, `POST /api/projects`, `PUT /api/projects/{name}`).
- [ ] 1.4 Add unit tests for configuration parsing, path expansion, and project management.

## 2. Timesheet Storage & Template Engine

- [ ] 2.1 Implement `TimesheetStorageService` for directory scanning (`<basePath>/<yyyy>/`), auto-creation of missing year/month CSVs, and atomic file saving.
- [ ] 2.2 Implement `CsvTemplate1Handler` with semicolon delimiter, dot decimal separator, and dynamic daily net hours computation.
- [ ] 2.3 Implement `CsvTemplate2Handler` with dynamic task columns, inline multiline bulletpoint notes in the `Notes` column, and dynamic total PT computation.
- [ ] 2.4 Implement `TimesheetResource` REST endpoints (`GET /api/timesheets/{project}/{year}/{month}`, `PUT /api/timesheets/{project}/{year}/{month}`, `GET /api/timesheets/{project}/years-months`).
- [ ] 2.5 Add integration tests covering CSV parsing, dynamic calculations, dynamic task additions, and atomic writes.

## 3. Frontend Architecture & OneNote-Style Navigation

- [ ] 3.1 Initialize Angular 22 project with Angular Material, SCSS, and Standalone Components.
- [ ] 3.2 Build `TimesheetNavigationComponent` with 3 collapsible/resizable columns (Projects, Years, Months) and quick action buttons (`+ Projekt`, `+ Jahr`, `+ Monat`).
- [ ] 3.3 Implement `TimesheetStateService` managing reactive selections, auto-navigation to the current month, and tree updates.
- [ ] 3.4 Implement `ProjectDialogComponent` for adding and editing project settings, base paths, templates, and default tasks.
- [ ] 3.5 Add component unit tests for navigation state and project configuration dialog.

## 4. Timesheet Matrix Editors & Keyboard Ergonomics

- [ ] 4.1 Implement `Template1EditorComponent` with editable timesheet grid, weekend highlighting, dynamic net hours sum, and debounced auto-save.
- [ ] 4.2 Implement `Template2EditorComponent` with dynamic monthly task columns, dynamic PT sums, and inline expanding textarea for daily bulletpoint notes.
- [ ] 4.3 Implement spreadsheet keyboard navigation (`Tab` for horizontal traversal, `Enter` for vertical day progression, `Ctrl+D` for full-row duplication).
- [ ] 4.4 Add unit and interaction tests for editor calculations, keyboard shortcuts, and auto-save debounce behavior.

## 5. Integration, Packaging & Build Verification

- [ ] 5.1 Configure Maven build to build Angular frontend assets into Quarkus `META-INF/resources` with SPA routing fallback.
- [ ] 5.2 Validate end-to-end development workflow (`mvn quarkus:dev` + `ng serve`) and production package build (`mvn clean package`).
- [ ] 5.3 Add README documentation detailing setup, configuration, and execution instructions.
