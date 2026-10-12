# Proposal: Project Rates and Net Invoice Amount Display

## Why
Freelancers and contractors frequently need an immediate, high-level overview of their monthly billing volume (net invoice amount) while tracking their time. Currently, `ps-timesheet` only displays recorded hours or person days and working days, requiring manual calculations to determine the monthly revenue.

By allowing users to define an optional hourly rate (`hourlyRate`) or daily rate (`dailyRate`) per project configuration and displaying the resulting net invoice amount directly above the timesheet table, the system delivers immediate financial insight without leaving the application.

## What Changes
- **Project Configuration**:
  - Add optional `hourlyRate` (Double/number in €) and `dailyRate` (Double/number in €) to `ProjectConfig` in backend and frontend.
  - Dynamically display the appropriate input field in `ProjectDialogComponent` based on the selected template (`WorkHours` -> Stundensatz in €, `PersonDays` -> Tagessatz in €).
- **Timesheet Editors**:
  - Extend the metrics bar in `WorkHoursEditorComponent` to compute and display `Rechnungsbetrag (Netto)` when `hourlyRate` is configured and greater than 0 (`totalNetHours * hourlyRate`).
  - Extend the metrics bar in `PersonDaysEditorComponent` to compute and display `Rechnungsbetrag (Netto)` when `dailyRate` is configured and greater than 0 (`totalPt * dailyRate`).
  - Seamlessly hide the metric item if no rate is configured or set to 0.

## Capabilities

### Modified Capabilities
- `configuration`: Adds `hourlyRate` and `dailyRate` fields to `ProjectConfig`.
- `timesheet-editor`: Adds reactive computation and display of the net invoice amount (`Rechnungsbetrag (Netto)`) in the metrics bar of both `WorkHours` and `PersonDays` editors.

## Impact
- **Backend**: Non-breaking additions of `hourlyRate` and `dailyRate` in `ProjectConfig.java`.
- **Frontend**: Form controls in `project-dialog.component.ts`, model updates in `project.model.ts`, and reactive calculation/formatting in `work-hours-editor.component.ts` and `person-days-editor.component.ts`.
