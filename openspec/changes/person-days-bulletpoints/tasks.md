# Tasks

## 1. Backend Data & Configuration Model

- [x] 1.1 Create `RecurringNoteConfig.java` and update `ProjectConfig.java` with `defaultNotes` and `recurringNotes` fields.
- [x] 1.2 Update `TimesheetDayDTO.java` with helper methods for `notesList` and automatic conversion between structured lists and multiline bulletpoint strings.
- [x] 1.3 Update `CsvPersonDaysHandler.java` ensuring bulletpoint prefixes and line breaks are parsed and saved cleanly.
- [x] 1.4 Add unit tests for `ProjectConfig` YAML serialization and `CsvPersonDaysHandler` note round-trips.

## 2. Frontend Models & Project Configuration UI

- [x] 2.1 Update `project.model.ts` and `timesheet.model.ts` with `RecurringNoteConfig`, `defaultNotes`, and `notesList` definitions.
- [x] 2.2 Extend `ProjectDialogComponent` with a section to add, edit, and delete `defaultNotes` and `recurringNotes` (with weekday pickers).
- [x] 2.3 Add unit tests for `ProjectDialogComponent` validation and config output.

## 3. PersonDays Editor Component Upgrade

- [x] 3.1 Replace the single notes `textarea` in `PersonDaysEditorComponent` with an additive chip container (`[ Note ✕ ]`) and inline text input (`Enter` to add).
- [x] 3.2 Add contextual quick-add buttons/chips for recurring notes matching the day's weekday.
- [x] 3.3 Add a quick-add menu to pick from configured project `defaultNotes`.
- [x] 3.4 Update row duplication (`Ctrl+D` / `duplicateFromPrevious`) and row clearing to copy and reset note lists cleanly.
- [x] 3.5 Style the notes cell with flex-wrap and compact chip styling matching Angular Material theme.

## 4. Verification & Testing

- [x] 4.1 Run backend tests (`mvn test`) and verify configuration and CSV persistence.
- [x] 4.2 Run frontend tests (`npm test` / `ng test`) and verify component interactions.
- [x] 4.3 Verify end-to-end build (`mvn clean package`) and full backward compatibility with existing timesheet files.
