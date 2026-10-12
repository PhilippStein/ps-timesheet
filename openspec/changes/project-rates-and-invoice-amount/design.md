# Technical Design: Project Rates and Net Invoice Amount

## Architectural Context
The net invoice amount calculation is designed to be reactive, lightweight, and purely client-side without altering storage formats, backend calculations, or existing PDF exports.

## Key Decisions

1. **Explicit Separation of `hourlyRate` and `dailyRate`**:
   - `ProjectConfig` contains two distinct optional fields: `hourlyRate` (for hourly billing in `WorkHours`) and `dailyRate` (for day-rate billing in `PersonDays`).
   - This provides explicit semantic typing and eliminates ambiguity when projects are edited or templates are switched.

2. **Conditional Presentation in Project Dialog**:
   - In `ProjectDialogComponent`, when `template === 'WorkHours'`, a form field for `hourlyRate` is rendered with label `Stundensatz (€)` and number input.
   - When `template === 'PersonDays'`, a form field for `dailyRate` is rendered with label `Tagessatz (€)` and number input.

3. **Reactive Metrics-Bar Integration**:
   - In `WorkHoursEditorComponent`:
     - Method / computed: `invoiceAmountNet = (state.activeMonthData()?.totalNetHours || 0) * (state.selectedProject()?.hourlyRate || 0)`
     - Displayed conditionally using `@if (hasHourlyRate())`
   - In `PersonDaysEditorComponent`:
     - Method / computed: `invoiceAmountNet = (state.activeMonthData()?.totalPt || 0) * (state.selectedProject()?.dailyRate || 0)`
     - Displayed conditionally using `@if (hasDailyRate())`
   - Formatted via a consistent helper `formatCurrency(val)` utilizing `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.

4. **Zero Footprint on Data Stores**:
   - CSV storage structures (`TimesheetMonthDTO`, `TimesheetDayDTO`) and PDF generation remain untouched.
