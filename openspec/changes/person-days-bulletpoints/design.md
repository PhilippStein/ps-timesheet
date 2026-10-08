# Design

## Context
In `ps-timesheet`, notes in the `PersonDays` template represent daily tasks, meetings, and achievements. Currently, `TimesheetDayDTO` holds a single `notes` String, which `CsvPersonDaysHandler` reads and writes directly to the CSV file. In the Angular frontend (`PersonDaysEditorComponent`), this is rendered as a multiline textarea. To streamline workflow efficiency and eliminate repetitive entry of common appointments, we are redesigning note handling into an additive list with chip representation and recurring note templates.

## Goals / Non-Goals

**Goals:**
- Enable 1-click addition and deletion of individual bulletpoint notes.
- Support project-level configuration of generic default notes (`defaultNotes`) and weekday-specific recurring notes (`recurringNotes`).
- Maintain 100% backward compatibility with existing timesheet CSV files (`Notes` column formatted as `- <entry>\n`).
- Provide fast keyboard interaction (`Enter` to add chip, keyboard navigation between cells).

**Non-Goals:**
- Changing the CSV storage format or adding new CSV columns (the existing `Notes` column will continue to store standard bulleted text).
- Complex recurrence rule engines (cron syntax, date range exceptions, or calendar sync).

## Decisions

### 1. Dual-Model Representation in DTO & Frontend
- **Decision**: Keep `notes: String` in `TimesheetDayDTO` while adding helper getter/setter methods for `notesList: List<String>`. In the Angular frontend `TimesheetDay`, support `notesList?: string[]` alongside `notes`.
- **Rationale**: Keeps CSV persistence completely unchanged while giving the frontend a native list representation for rendering chips.
- **Alternatives Considered**: Altering CSV columns to store JSON arrays, which would break external spreadsheet viewers and backward compatibility.

### 2. Configuration Model in `ProjectConfig`
- **Decision**: Add `List<String> defaultNotes` and `List<RecurringNoteConfig> recurringNotes` to `ProjectConfig`.
  ```java
  public class RecurringNoteConfig {
      private String text;
      private List<String> days = new ArrayList<>(); // e.g. ["Montag", "Dienstag", ...]
  }
  ```
- **Rationale**: Cleanly separates unconstrained template suggestions from day-of-week constrained suggestions, matching user intuition.

### 3. Chip-Based Interactive UI in `PersonDaysEditorComponent`
- **Decision**: Render a flexbox container with:
  1. Badges/chips for each active note with a remove icon (`✕`).
  2. Quick-add buttons for matching recurring notes not yet added to this day.
  3. An inline input field for typing freeform notes, adding them to the list upon pressing `Enter`.
  4. A dropdown button (`+`) displaying project default notes for quick selection.
- **Rationale**: Maximizes speed of entry and gives instant visual clarity on logged bulletpoints without opening modal dialogs.

## Risks / Trade-offs

- **[Multiline String Serialization]** → When converting between `List<String>` and CSV `Notes` string, normalize whitespace and strip `- ` / `* ` prefixes to avoid double bulleting.
- **[Row Height Expansion]** → Multiple chips might increase cell height; flex-wrap ensures chips wrap naturally without breaking horizontal alignment of PT inputs across rows.
