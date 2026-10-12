# Proposal: Project Year and Total Statistics Overview

## Why
Users tracking hours or person days currently lack a high-level summary of their annual and overall project performance. To evaluate total workload, actual vs. possible working days, sick and vacation days, actual billing revenue, and maximal potential revenue (without absences), users currently have to inspect each month individually and calculate totals by hand.

Providing a dedicated statistics view per year (`Jahresübersicht`) and across all recorded years (`Gesamtübersicht`) with backend-aggregated metrics, tabular monthly/yearly breakdowns, and task distributions directly delivers deep business insights and transparency.

## What Changes
- **Navigation Integration**:
  - Add `[ 📊 Gesamtübersicht ]` button in the footer of the "JAHRE" navigation column.
  - Add `[ 📊 Jahresübersicht ]` button in the footer of the "MONATE" navigation column.
  - Extend `TimesheetStateService` with view mode management (`activeView: 'month-editor' | 'year-stats' | 'project-stats'`).
- **Backend Aggregation Service & REST API**:
  - Implement `TimesheetStatsService` to scan project directories/CSV files and calculate aggregated statistics.
  - Add REST endpoints `GET /api/timesheets/{project}/stats?year={year}` (annual stats) and `GET /api/timesheets/{project}/stats` (all-time stats).
  - Calculate actual and possible work days (Mo–Fr excluding holidays), sick days, vacation days, holiday days, utilization rate (`actualWorkDays / possibleWorkDays * 100`).
  - Calculate net revenue (`actualRevenueNet`) and maximal revenue potential (`maxRevenueNet`) when hourly or daily rates are configured.
  - Aggregate task summaries (total PT per task) for `PersonDays` templates.
- **Frontend Statistics Dashboard**:
  - Implement `ProjectStatsComponent` displaying KPI cards (Revenue, Max Potential, Working Days & Utilization, Absences), breakdown table, task distribution table (for PersonDays), and earnings/loss analysis.
  - Dynamically hide revenue and financial loss cards when no rate is configured for the project.

## Capabilities

### Added Capabilities
- `project-statistics`: Backend aggregation and frontend dashboard for project annual and total statistics overview.

### Modified Capabilities
- `timesheet-navigation`: Column footer action buttons for opening project-level and year-level statistics.

## Impact
- **Backend**: New DTOs (`ProjectStatsDTO`, `StatsBreakdownRowDTO`, `TaskStatSummaryDTO`), new service `TimesheetStatsService`, and new endpoints in `TimesheetResource`.
- **Frontend**: New component `ProjectStatsComponent`, extended state and API service in `timesheet-state.service.ts` and `timesheet-api.service.ts`, footer buttons in `timesheet-navigation.component.ts`.
