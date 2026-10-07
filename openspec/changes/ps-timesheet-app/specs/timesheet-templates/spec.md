# Spec Delta

## Purpose
Defines time-tracking templates for timestamp tracking and dynamic task person-days tracking.

## ADDED Requirements

### Requirement: WorkHours Template - Timestamp Tracking
The system SHALL support the WorkHours template (`WorkHours`) recording Date, DayOfWeek, StartTime (HH:mm), EndTime (HH:mm), PauseMinutes, and Comment per day, calculating daily net hours dynamically without storing net hours as a persistent CSV column.

#### Scenario: Dynamic net hours calculation
- **WHEN** StartTime is 08:30, EndTime is 17:00, and PauseMinutes is 30
- **THEN** daily net hours is dynamically calculated as 8.0 hours and included in monthly totals

#### Scenario: WorkHours CSV persistence
- **WHEN** saving WorkHours timesheet data
- **THEN** the CSV file is saved with columns `Date;DayOfWeek;StartTime;EndTime;PauseMinutes;Comment` using semicolon delimiter

### Requirement: PersonDays Template - Dynamic Task Person-Days and Daily Notes
The system SHALL support the PersonDays template (`PersonDays`) recording Date, DayOfWeek, dynamic monthly task person-days (PT), and daily multiline bulletpoint notes in a dedicated `Notes` column, calculating daily and monthly total PT dynamically without storing total PT as a persistent CSV column.

#### Scenario: Dynamic task columns per month
- **WHEN** a user modifies task column headers for a specific month
- **THEN** the month's CSV header is updated with the custom task columns without affecting previous months

#### Scenario: Multiline daily bulletpoints in Notes column
- **WHEN** a user enters multiline bulletpoint accomplishments for a day
- **THEN** the notes are persisted in the `Notes` column of that day's CSV row with standard multiline escaping and quoting
