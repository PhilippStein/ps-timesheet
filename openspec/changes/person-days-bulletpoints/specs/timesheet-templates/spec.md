# Spec Delta

## Purpose
Enables structured list-based representation of daily bulletpoint notes while ensuring transparent round-trip conversion with the CSV `Notes` column format.

## ADDED Requirements

### Requirement: Structured Notes List Conversion
The system SHALL support bidirectional mapping between raw multiline CSV text (`Notes` column formatted as `- Item 1\n- Item 2`) and structured string arrays (`notesList`).

#### Scenario: Reading CSV notes into structured list
- **WHEN** reading a PersonDays CSV record where `Notes` contains `"- Daily\n- SP Weekly"`
- **THEN** `TimesheetDayDTO` exposes both the joined `notes` string and a parsed `notesList` `["Daily", "SP Weekly"]`

#### Scenario: Writing structured notes list to CSV
- **WHEN** persisting a `TimesheetDayDTO` with `notesList` or `notes`
- **THEN** the CSV file stores the notes formatted as standard bulleted lines prefixed with `- ` and separated by newlines, preserving standard CSV multiline quoting
