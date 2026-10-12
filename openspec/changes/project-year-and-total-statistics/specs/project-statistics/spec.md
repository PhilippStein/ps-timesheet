# Spec Delta: Project Statistics

## Purpose
Specifies backend aggregation and frontend presentation of annual and all-time project statistics, including worked units, actual vs. possible working days, vacation/sick/holiday days, utilization, task breakdown, and financial revenue potential.

## ADDED Requirements

### Requirement: REST Endpoints for Project Statistics
The backend SHALL expose REST endpoints to retrieve aggregated statistics for a specific project:
- `GET /api/timesheets/{project}/stats?year={year}`: Aggregates all recorded months in the given year.
- `GET /api/timesheets/{project}/stats`: Aggregates all recorded years and months for the project.

The response SHALL be serialized as `ProjectStatsDTO` with the following structure:
- `projectName` (String): Name of the project.
- `template` (String): Template type (`WorkHours` or `PersonDays`).
- `year` (Integer, optional): The target year (or null for all-time stats).
- `hourlyRate` (Double, optional): The project's hourly rate if set.
- `dailyRate` (Double, optional): The project's daily rate if set.
- `totalLoggedUnits` (Double): Total net hours (`WorkHours`) or total PT (`PersonDays`).
- `actualWorkDays` (Integer): Count of days with logged work units > 0.
- `possibleWorkDays` (Integer): Total regular weekdays (Monday–Friday) in the period excluding public holidays.
- `vacationDays` (Double): Count of days with status or location `URLAUB`.
- `sickDays` (Double): Count of days with status or location `KRANK`.
- `holidayDays` (Double): Count of days with status or location `FEIERTAG`.
- `utilizationPercent` (Double): `(actualWorkDays / possibleWorkDays) * 100` (or `0.0` if `possibleWorkDays == 0`).
- `actualRevenueNet` (Double, optional): Computed as `totalLoggedUnits * rate` when a rate is configured.
- `maxRevenueNet` (Double, optional): Computed as `possibleWorkDays * (8.0 or 1.0) * rate` when a rate is configured.
- `vacationLossNet` (Double, optional): Computed as `vacationDays * (8.0 or 1.0) * rate` when a rate is configured.
- `sickLossNet` (Double, optional): Computed as `sickDays * (8.0 or 1.0) * rate` when a rate is configured.
- `diffRevenueNet` (Double, optional): Computed as `actualRevenueNet - maxRevenueNet`.
- `breakdownRows` (List): Ordered list of monthly rows (for year view) or yearly rows (for all-time view).
- `taskSummaries` (List, optional): List of `{ taskName, totalPt }` ordered by total PT descending (for `PersonDays`).

#### Scenario: Requesting annual statistics for a WorkHours project
- **GIVEN** a project with template `WorkHours` and `hourlyRate = 95.0`
- **WHEN** client sends `GET /api/timesheets/ProjectA/stats?year=2025`
- **THEN** the server returns `200 OK` with `ProjectStatsDTO` containing `year = 2025`, `breakdownRows` for months 1..12, computed work days, and revenue fields.

#### Scenario: Requesting all-time statistics for a PersonDays project
- **GIVEN** a project with template `PersonDays` and `dailyRate = 950.0`
- **WHEN** client sends `GET /api/timesheets/ProjectB/stats`
- **THEN** the server returns `200 OK` with `ProjectStatsDTO` containing `year = null`, `breakdownRows` for all available years, and `taskSummaries` aggregated across all days.

---

### Requirement: Statistics Dashboard UI
The frontend SHALL display a dedicated `ProjectStatsComponent` when navigating to year statistics or total project statistics:
1. **KPI Cards**:
   - `RECHNUNGSBETRAG (IST)` & `MAX. POTENZIAL` (displayed only when project rate is configured and `> 0`).
   - `ARBEITSTAGE & AUSLASTUNG` (actual vs. possible work days, utilization percentage).
   - `ABWESENHEITEN` (vacation days, sick days, holiday count).
2. **Breakdown Table**:
   - Table rows displaying Period (Month/Year), Logged units, Work days (`actual / possible`), Vacation, Sick, and Net Revenue (if rate configured).
   - Summary row (`GESAMT`) at the bottom.
3. **Task Distribution Table (PersonDays only)**:
   - Lists tasks with total PT and percentage of total effort.
4. **Earnings & Loss Analysis**:
   - Visual breakdown of Max Potential, Vacation Loss, Sick Loss, Unused capacity / Variance, and Actual Net Revenue (only displayed if rate configured).

#### Scenario: Displaying statistics without configured rate
- **GIVEN** a project without `hourlyRate` or `dailyRate` configured
- **WHEN** the user opens the statistics overview
- **THEN** the revenue KPI cards, revenue column in the table, and the earnings analysis section MUST be hidden.
