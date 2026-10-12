# Implementation Tasks: Project Year and Total Statistics Overview

## Phase 1: Backend DTOs & Statistics Service
- [x] 1.1 Create `ProjectStatsDTO`, `StatsBreakdownRowDTO`, and `TaskStatSummaryDTO` in `de.phstein.timesheet.model`.
- [x] 1.2 Implement `TimesheetStatsService` in `de.phstein.timesheet.service` to scan directory files, aggregate work units, count actual vs. possible work days, vacation, sick, holidays, and compute net financial potentials.
- [x] 1.3 Add task summary aggregation for `PersonDays` templates.

## Phase 2: REST Endpoints & Backend Tests
- [x] 2.1 Add `GET /api/timesheets/{project}/stats` endpoint in `TimesheetResource` accepting optional `@QueryParam("year") Integer year`.
- [x] 2.2 Create unit and integration tests (`TimesheetStatsServiceTest`, `TimesheetResourceTest`) for both `WorkHours` and `PersonDays` templates, with and without configured rates.

## Phase 3: Frontend Models, API & State
- [x] 3.1 Define TypeScript interfaces in `project-stats.model.ts` (or `timesheet.model.ts`).
- [x] 3.2 Add `getProjectStats(projectName: string, year?: number)` in `TimesheetApiService`.
- [x] 3.3 Extend `TimesheetStateService` with `activeView` signal (`'month-editor' | 'year-stats' | 'project-stats'`), `projectStats` signal, and navigation helper methods.

## Phase 4: Navigation Integration
- [x] 4.1 Add `[ 📊 Gesamtübersicht ]` button in the footer of the year column in `TimesheetNavigationComponent`.
- [x] 4.2 Add `[ 📊 Jahresübersicht ]` button in the footer of the month column in `TimesheetNavigationComponent`.
- [x] 4.3 Handle view switching and selection states (deselecting month/year as appropriate).

## Phase 5: Statistics Dashboard Component
- [x] 5.1 Implement `ProjectStatsComponent` with KPI cards (Revenue, Max Potential, Working Days, Absences).
- [x] 5.2 Implement tabular breakdown by Month (for year view) or Year (for all-time view).
- [x] 5.3 Implement task distribution table for `PersonDays` templates.
- [x] 5.4 Implement earnings and loss analysis section (conditional on configured rate).
- [x] 5.5 Integrate `ProjectStatsComponent` into `app.html` workspace based on `activeView`.

## Phase 6: Verification & Automated Tests
- [x] 6.1 Run backend tests (`mvn test`) and ensure all pass.
- [x] 6.2 Add component unit tests for `ProjectStatsComponent` and update navigation specs.
- [x] 6.3 Run frontend tests (`npm test`) and full build (`mvn package`).
