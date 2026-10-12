# Spec Delta: Project Rates Configuration

## Purpose
Extends `ProjectConfig` to support optional hourly rates (`hourlyRate`) and daily rates (`dailyRate`) in EUR for invoicing estimation.

## ADDED Requirements

### Requirement: Hourly and Daily Rates in Project Configuration
The system SHALL support storing optional hourly and daily rates in `ProjectConfig`:
- `hourlyRate` (Double, optional): The hourly rate in EUR, used when the project template is `WorkHours`.
- `dailyRate` (Double, optional): The daily rate in EUR, used when the project template is `PersonDays`.

#### Scenario: Configuring rate in project settings
- **GIVEN** a user creates or edits a project with template `WorkHours`
- **WHEN** the user provides an hourly rate (e.g. `95.00`)
- **THEN** the system SHALL persist `hourlyRate: 95.0` in `ProjectConfig` within `~/.pstimesheet.yaml`

#### Scenario: Configuring daily rate for PersonDays
- **GIVEN** a user creates or edits a project with template `PersonDays`
- **WHEN** the user provides a daily rate (e.g. `950.00`)
- **THEN** the system SHALL persist `dailyRate: 950.0` in `ProjectConfig` within `~/.pstimesheet.yaml`
