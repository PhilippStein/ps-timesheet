# Technical Design: Project Year and Total Statistics Overview

## Architectural Context
The statistics feature aggregates existing monthly CSV data to provide annual and all-time insights into work duration, attendance vs. absence, utilization, and financial revenue. Aggregation is performed server-side for maximum performance, minimal payload transfer, and deterministic metric calculations.

```
+-----------------------------------------------------------------------------------+
|                        PROJECT STATISTICS PIPELINE                                |
+-----------------------------------------------------------------------------------+

 Frontend (Angular)                                Backend (Quarkus)
+------------------------+                        +----------------------------------+
| TimesheetNavigation    |                        | TimesheetResource                |
|  [ Gesamtübersicht ]   |-(GET /api/timesheets/  |  GET /{project}/stats?year=2026  |
|  [ Jahresübersicht ] --|    {project}/stats)--->|  GET /{project}/stats            |
+------------------------+                        +-----------------+----------------+
                                                                    |
                                                                    v
+------------------------+                        +----------------------------------+
| ProjectStatsComponent  |<---(ProjectStatsDTO)---| TimesheetStatsService            |
|  - KPI Cards           |                        |  - Scans project directory       |
|  - Breakdown Table     |                        |  - Loads TimesheetMonthDTOs      |
|  - Task Summary Table  |                        |  - Aggregates hours/PT & days    |
|  - Ertragsanalyse      |                        |  - Computes revenues & losses    |
+------------------------+                        +----------------------------------+
```

## Key Decisions

1. **Server-Side Aggregation (`TimesheetStatsService`)**:
   - Reuses `TimesheetStorageService.loadMonth(project, year, month)` to parse month CSVs without redundant CSV parsing logic.
   - Computes:
     - `actualWorkDays`: Days where logged units > 0.
     - `possibleWorkDays`: Count of all calendar weekdays (Monday through Friday) in the period minus recorded `FEIERTAG` days.
     - `vacationDays`, `sickDays`, `holidayDays`: Aggregated from `TimesheetDayDTO.isVacationOrSick()`, status, and location.
     - `taskSummaries`: Map of `taskName -> sum(PT)` aggregated across all days for `PersonDays` templates.

2. **Financial Analysis (Only When Rate Configured)**:
   - Evaluates `hourlyRate` (for `WorkHours`) or `dailyRate` (for `PersonDays`).
   - `maxRevenueNet = possibleWorkDays * standardDailyUnits * rate` (where standard daily units = `8.0` for WorkHours, `1.0` for PersonDays).
   - `actualRevenueNet = totalLoggedUnits * rate`.
   - `vacationLossNet = vacationDays * standardDailyUnits * rate`.
   - `sickLossNet = sickDays * standardDailyUnits * rate`.
   - If no rate is configured, all revenue fields are omitted/null and frontend cards/sections are hidden.

3. **Frontend State & View Navigation (`TimesheetStateService`)**:
   - Introduces `activeView: WritableSignal<'month-editor' | 'year-stats' | 'project-stats'>`.
   - Selecting a month resets `activeView` to `'month-editor'`.
   - Clicking `[ 📊 Gesamtübersicht ]` sets `activeView = 'project-stats'` and loads stats without `year`.
   - Clicking `[ 📊 Jahresübersicht ]` sets `activeView = 'year-stats'` and loads stats for the currently selected year.

4. **Component Design (`ProjectStatsComponent`)**:
   - Standalone Angular component embedded in the main workspace via `@if (state.activeView() !== 'month-editor')`.
   - Uses Angular Material cards, tables, and formatted currency/decimal helpers.
   - Highlights positive/negative variance in colors (`#2e7d32` for revenue, `#d32f2f` for losses/differences).
