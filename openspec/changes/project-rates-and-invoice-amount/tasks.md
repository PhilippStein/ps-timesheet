# Implementation Tasks: Project Rates and Net Invoice Amount

## Phase 1: Configuration Models (Backend & Frontend)
- [x] 1.1 Extend `ProjectConfig.java` with `hourlyRate` and `dailyRate` (Double) getters/setters.
- [x] 1.2 Extend `project.model.ts` with `hourlyRate?: number | null` and `dailyRate?: number | null`.

## Phase 2: Project Dialog UI
- [x] 2.1 Add `hourlyRate` and `dailyRate` inputs in `ProjectDialogComponent`.
- [x] 2.2 Wire inputs dynamically based on selected template (`WorkHours` -> Stundensatz, `PersonDays` -> Tagessatz).
- [x] 2.3 Update `ProjectDialogComponent` tests to verify rate persistence and template switches.

## Phase 3: Metrics-Bar Display in Timesheet Editors
- [x] 3.1 Implement `Rechnungsbetrag (Netto)` display in `WorkHoursEditorComponent` metrics bar when `hourlyRate > 0`.
- [x] 3.2 Implement `Rechnungsbetrag (Netto)` display in `PersonDaysEditorComponent` metrics bar when `dailyRate > 0`.
- [x] 3.3 Verify currency formatting (`Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`).

## Phase 4: Verification & Automated Tests
- [x] 4.1 Update / run backend tests (`mvn test`).
- [x] 4.2 Update / run frontend tests (`npm test`).
