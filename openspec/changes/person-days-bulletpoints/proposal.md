# Proposal: Additive Bulletpoint Notes & Recurring Default Notes in PersonDays

## Why
In the PersonDays timesheet template, daily activities are currently entered in a single raw multiline textarea. This leads to redundant typing for recurring tasks (such as daily standups, weekly refinement meetings, or weekly reviews), potential formatting inconsistencies, and friction when managing individual accomplishment items. 

Providing structured, additive bulletpoint management (individual chips with removal buttons, instant entry on Enter) together with project-wide default notes and weekday-specific recurring note templates substantially reduces daily friction, prevents typos, and accelerates time recording.

## What Changes
- **Project Configuration**: Extend project configuration in `~/.pstimesheet.yaml` to support `defaultNotes` (general quick-add templates) and `recurringNotes` (weekday-specific note definitions like "Daily" on Mon–Fri, "SP Weekly" on Wednesday, "Dev Weekly" on Friday).
- **Project Settings Dialog**: Update `ProjectDialogComponent` to allow defining and editing `defaultNotes` and `recurringNotes` per project.
- **Backend Data Model & DTOs**: Support structured list-based note models in `ProjectConfig`, `RecurringNoteConfig`, and `TimesheetDayDTO`, while maintaining full backward compatibility with the existing multiline CSV `Notes` column (`- <item>\n`).
- **Interactive Notes Chip/List Editor**: Replace the plain textarea in `PersonDaysEditorComponent` with an interactive additive list:
  - Individual bulletpoint chips with one-click deletion (`✕`).
  - An inline input field for typing new bulletpoints and adding them immediately on `Enter`.
  - Quick-add suggestion chips/buttons for recurring notes relevant to the specific day of the week.
  - Quick-add menu/palette for general project default notes.

## Capabilities

### Modified Capabilities
- `configuration`: Extended `ProjectConfig` schema and serialization for `defaultNotes` and `recurringNotes`.
- `timesheet-templates`: Dual-representation support in `PersonDays` model/handler ensuring seamless round-trip between structured bulletpoint lists and CSV multiline text.
- `timesheet-editor`: Upgraded `PersonDaysEditorComponent` note column from raw textarea to an additive chip/tag list with recurring suggestions.

## Impact
- **Backend**: `ProjectConfig.java`, `TimesheetDayDTO.java`, `CsvPersonDaysHandler.java` updated. No breaking changes to existing CSV files or storage layout.
- **Frontend**: `project.model.ts`, `timesheet.model.ts`, `project-dialog.component.ts`, `person-days-editor.component.ts` updated.
- **Persistence**: Fully backward-compatible with existing CSV timesheet files.
