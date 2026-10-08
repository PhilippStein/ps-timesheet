# Spec Delta

## Purpose
Transforms the daily notes column in the PersonDays timesheet editor from a single textarea into an interactive, additive chip list with quick-add actions and recurring suggestions.

## ADDED Requirements

### Requirement: Additive Bulletpoint Chip List
The system SHALL render individual bulletpoint notes as removable chips/tags within each day's row in `PersonDaysEditorComponent`.

#### Scenario: Display existing notes as chips
- **WHEN** a day contains notes `["Daily", "SP Weekly"]`
- **THEN** each note is rendered as a distinct chip with text and a delete button (`✕`)

#### Scenario: Remove bulletpoint chip
- **WHEN** a user clicks the remove button on a chip
- **THEN** that specific note item is removed from the day's notes, the table recalculates state, and the change is auto-saved

### Requirement: Inline Additive Input Field
The system SHALL provide an inline text input at the end of the chip list allowing the user to add new bulletpoints quickly.

#### Scenario: Add bulletpoint via Enter
- **WHEN** a user types text in the inline notes input and presses `Enter`
- **THEN** a new chip is appended to the day's note list, the input field is cleared, and changes are debounced/saved

### Requirement: Contextual Quick-Add Suggestions
The system SHALL display quick-add suggestion buttons for recurring notes matching the day's weekday and offer a menu for project default notes.

#### Scenario: Weekday-specific quick add button
- **WHEN** viewing a Wednesday row and the project configuration defines "SP Weekly" for Wednesday
- **THEN** if "SP Weekly" is not yet added to this day, a small quick-add button/chip `+ SP Weekly` is displayed for instant 1-click addition

#### Scenario: General default notes menu
- **WHEN** a user clicks the add template icon (`+`) on the notes cell
- **THEN** a dropdown menu displays all configured project `defaultNotes` for quick selection
