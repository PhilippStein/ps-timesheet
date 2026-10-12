# Spec Delta: Net Invoice Amount Display in Timesheet Editors

## Purpose
Specifies the calculation and presentation of the monthly net invoice amount (`Rechnungsbetrag (Netto)`) in the top metrics bar of `WorkHours` and `PersonDays` timesheet editors.

## ADDED Requirements

### Requirement: Net Invoice Amount in WorkHours Metrics Bar
When a project with `WorkHours` template has a configured `hourlyRate > 0`, the system SHALL display the calculated net invoice amount in the header metrics bar.
- **Formula**: `totalNetHours * hourlyRate`
- **Formatting**: Currency formatted according to German locale (e.g. `15.200,00 €`).
- **Visibility**: If `hourlyRate` is null, undefined, or `<= 0`, the metric item MUST NOT be displayed.

#### Scenario: Displaying net invoice amount for WorkHours
- **GIVEN** a project with `template = 'WorkHours'` and `hourlyRate = 95.0`
- **WHEN** the month has `totalNetHours = 160.0`
- **THEN** the metrics bar SHALL display `Rechnungsbetrag (Netto): 15.200,00 €`

#### Scenario: Hiding net invoice amount when hourlyRate is missing
- **GIVEN** a project with `template = 'WorkHours'` and no `hourlyRate` configured
- **WHEN** viewing the timesheet editor
- **THEN** the metrics bar SHALL NOT display the `Rechnungsbetrag (Netto)` item

### Requirement: Net Invoice Amount in PersonDays Metrics Bar
When a project with `PersonDays` template has a configured `dailyRate > 0`, the system SHALL display the calculated net invoice amount in the header metrics bar.
- **Formula**: `totalPt * dailyRate`
- **Formatting**: Currency formatted according to German locale (e.g. `17.575,00 €`).
- **Visibility**: If `dailyRate` is null, undefined, or `<= 0`, the metric item MUST NOT be displayed.

#### Scenario: Displaying net invoice amount for PersonDays
- **GIVEN** a project with `template = 'PersonDays'` and `dailyRate = 950.0`
- **WHEN** the month has `totalPt = 18.5`
- **THEN** the metrics bar SHALL display `Rechnungsbetrag (Netto): 17.575,00 €`

#### Scenario: Hiding net invoice amount when dailyRate is missing
- **GIVEN** a project with `template = 'PersonDays'` and no `dailyRate` configured
- **WHEN** viewing the timesheet editor
- **THEN** the metrics bar SHALL NOT display the `Rechnungsbetrag (Netto)` item
