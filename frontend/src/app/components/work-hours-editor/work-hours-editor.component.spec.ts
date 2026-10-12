import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkHoursEditorComponent } from './work-hours-editor.component';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetApiService } from '../../services/timesheet-api.service';
import { DayStatus } from '../../models/timesheet.model';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('WorkHoursEditorComponent', () => {
  let component: WorkHoursEditorComponent;
  let fixture: ComponentFixture<WorkHoursEditorComponent>;
  let stateService: TimesheetStateService;

  beforeEach(async () => {
    const apiSpy = {
      getProjects: vi.fn().mockReturnValue(of([{ name: 'Test', basePath: '/tmp/test', template: 'WorkHours' }])),
      getProjectTree: vi.fn().mockReturnValue(of({ projectName: 'Test', basePath: '/tmp/test', template: 'WorkHours', years: [] })),
      getMonth: vi.fn().mockReturnValue(of({
        projectName: 'Test',
        year: 2026,
        month: 10,
        template: 'WorkHours',
        taskColumns: [],
        days: [
          { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, startTime: '08:00', endTime: '16:30', pauseMinutes: 30 }
        ]
      })),
      saveMonth: vi.fn().mockReturnValue(of(null))
    };

    await TestBed.configureTestingModule({
      imports: [WorkHoursEditorComponent],
      providers: [
        provideNoopAnimations(),
        TimesheetStateService,
        { provide: TimesheetApiService, useValue: apiSpy }
      ]
    }).compileComponents();

    stateService = TestBed.inject(TimesheetStateService);
    fixture = TestBed.createComponent(WorkHoursEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should format times correctly using smartFormatTime', () => {
    expect(component.smartFormatTime('8')).toBe('08:00');
    expect(component.smartFormatTime('830')).toBe('08:30');
    expect(component.smartFormatTime('1700')).toBe('17:00');
    expect(component.smartFormatTime('8.5')).toBe('08:30');
  });

  it('should calculate worked workdays excluding weekends', () => {
    stateService.activeMonthData.set({
      projectName: 'Test',
      year: 2026,
      month: 10,
      template: 'WorkHours',
      taskColumns: [],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, netHours: 8 },
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, netHours: 0 },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, netHours: 5 },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, netHours: 0 }
      ]
    });

    expect(component.countTotalWorkDays()).toBe(2);
    expect(component.countWorkedDays()).toBe(1);
  });

  it('should exclude vacation, sick, and holiday days from work days count while keeping hours in total', () => {
    stateService.activeMonthData.set({
      projectName: 'Test',
      year: 2026,
      month: 10,
      template: 'WorkHours',
      taskColumns: [],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, netHours: 8, status: null },
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, netHours: 4, status: DayStatus.URLAUB },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, netHours: 0, status: null },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, netHours: 0, status: null },
        { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, netHours: 0, status: DayStatus.KRANK },
        { date: '2026-10-06', dayOfWeek: 'Dienstag', isWeekend: false, netHours: 7.5, status: null },
        { date: '2026-10-07', dayOfWeek: 'Mittwoch', isWeekend: false, netHours: 0, status: DayStatus.FEIERTAG }
      ]
    });

    // 5 weekdays: 1 vacation, 1 sick, 1 holiday => 2 regular work days
    expect(component.countTotalWorkDays()).toBe(2);
    // 2 regular work days: 10-01 has 8h, 10-06 has 7.5h => 2 worked workdays
    expect(component.countWorkedDays()).toBe(2);
    expect(component.isVacation(stateService.activeMonthData()!.days[1])).toBe(true);
    expect(component.isSick(stateService.activeMonthData()!.days[4])).toBe(true);
    expect(component.isHoliday(stateService.activeMonthData()!.days[6])).toBe(true);
  });

  it('should identify empty weekend rows and hide them when setting is enabled', () => {
    const emptyWeekend = { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, startTime: null, endTime: null, pauseMinutes: null, comment: null, netHours: null };
    const filledWeekend = { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, startTime: '08:00', endTime: '12:00', pauseMinutes: 0, comment: 'Support', netHours: 4 };
    const weekday = { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, startTime: null, endTime: null, pauseMinutes: null, comment: null, netHours: null };

    stateService.hideEmptyWeekends.set(false);
    expect(component.isRowHidden(emptyWeekend)).toBe(false);
    expect(component.isRowHidden(filledWeekend)).toBe(false);
    expect(component.isRowHidden(weekday)).toBe(false);

    stateService.hideEmptyWeekends.set(true);
    expect(component.isRowHidden(emptyWeekend)).toBe(true);
    expect(component.isRowHidden(filledWeekend)).toBe(false);
    expect(component.isRowHidden(weekday)).toBe(false);
  });

  it('should skip hidden weekends when finding previous visible row index', () => {
    stateService.activeMonthData.set({
      projectName: 'Test',
      year: 2026,
      month: 10,
      template: 'WorkHours',
      taskColumns: [],
      days: [
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, startTime: '08:00', endTime: '17:00' },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, startTime: null, endTime: null },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, startTime: null, endTime: null },
        { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, startTime: null, endTime: null }
      ]
    });

    stateService.hideEmptyWeekends.set(true);
    expect(component.getPreviousVisibleRowIndex(3)).toBe(0); // From Monday (index 3), previous visible is Friday (index 0)
    expect(component.getNextVisibleRowIndex(0)).toBe(3); // From Friday (index 0), next visible is Monday (index 3)
  });

  it('should identify week separators when weekends are hidden', () => {
    stateService.activeMonthData.set({
      projectName: 'Test',
      year: 2026,
      month: 10,
      template: 'WorkHours',
      taskColumns: [],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, startTime: '08:00', endTime: '17:00' },
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, startTime: '08:00', endTime: '17:00' },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, startTime: null, endTime: null },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, startTime: null, endTime: null },
        { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, startTime: '08:00', endTime: '17:00' },
        { date: '2026-10-06', dayOfWeek: 'Dienstag', isWeekend: false, startTime: '08:00', endTime: '17:00' }
      ]
    });

    stateService.hideEmptyWeekends.set(false);
    expect(component.isWeekSeparator(0)).toBe(false); // First row
    expect(component.isWeekSeparator(1)).toBe(false); // Freitag
    expect(component.isWeekSeparator(4)).toBe(false); // Montag when weekends are visible

    stateService.hideEmptyWeekends.set(true);
    expect(component.isWeekSeparator(0)).toBe(false); // First row
    expect(component.isWeekSeparator(1)).toBe(false); // Same week as Thursday
    expect(component.isWeekSeparator(4)).toBe(true);  // Montag is start of new week after Friday
    expect(component.isWeekSeparator(5)).toBe(false); // Dienstag is same week as Monday
  });
  it('should calculate and format net invoice amount when hourlyRate is configured', () => {
    stateService.selectedProject.set({
      name: 'Test',
      basePath: '/tmp/test',
      template: 'WorkHours',
      hourlyRate: 95.0
    });
    stateService.activeMonthData.set({
      projectName: 'Test',
      year: 2026,
      month: 10,
      template: 'WorkHours',
      taskColumns: [],
      totalNetHours: 160.0,
      days: []
    });

    expect(component.hasHourlyRate()).toBe(true);
    expect(component.calculateInvoiceAmount()).toBe(15200);
    const formatted = component.formatCurrency(15200);
    expect(formatted).toContain('15.200');
    expect(formatted).toContain('€');
  });

  it('should not show hourly rate when not configured', () => {
    stateService.selectedProject.set({
      name: 'Test',
      basePath: '/tmp/test',
      template: 'WorkHours'
    });
    expect(component.hasHourlyRate()).toBe(false);
  });

  it('should identify end of week on Sundays and on the last day of the month', () => {
    stateService.activeMonthData.set({
      projectName: 'Test',
      year: 2026,
      month: 10,
      template: 'WorkHours',
      taskColumns: [],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, netHours: 8 },
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, netHours: 8 },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, netHours: 0 },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, netHours: 0 },
        { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, netHours: 8 },
        { date: '2026-10-06', dayOfWeek: 'Dienstag', isWeekend: false, netHours: 8 }
      ]
    });

    // Thursday (0), Friday (1), Saturday (2) are not end of week
    expect(component.isEndOfWeek(0)).toBe(false);
    expect(component.isEndOfWeek(1)).toBe(false);
    expect(component.isEndOfWeek(2)).toBe(false);

    // Sunday (3) is end of week
    expect(component.isEndOfWeek(3)).toBe(true);

    // Monday (4) is not end of week
    expect(component.isEndOfWeek(4)).toBe(false);

    // Tuesday (5) is the last day of the month in this dataset, so it is end of week
    expect(component.isEndOfWeek(5)).toBe(true);
  });

  it('should calculate weekly net hours correctly for each week', () => {
    stateService.activeMonthData.set({
      projectName: 'Test',
      year: 2026,
      month: 10,
      template: 'WorkHours',
      taskColumns: [],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, netHours: 8 },
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, netHours: 7.5 },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, netHours: 2 },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, netHours: 0 },
        { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, netHours: 8 },
        { date: '2026-10-06', dayOfWeek: 'Dienstag', isWeekend: false, netHours: 4 }
      ]
    });

    // Week 1 (Oct 1 - Oct 4): 8 + 7.5 + 2 + 0 = 17.5 hours
    expect(component.getWeekNetHours(3)).toBe(17.5);

    // Week 2 (Oct 5 - Oct 6, last day): 8 + 4 = 12 hours
    expect(component.getWeekNetHours(5)).toBe(12);
  });

  it('should render weekly summary rows in the table with correct sums', () => {
    stateService.activeMonthData.set({
      projectName: 'Test',
      year: 2026,
      month: 10,
      template: 'WorkHours',
      taskColumns: [],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, netHours: 8 },
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, netHours: 8 },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, netHours: 0 },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, netHours: 0 },
        { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, netHours: 6 }
      ]
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const weekSummaryRows = compiled.querySelectorAll('.week-summary-row');
    expect(weekSummaryRows.length).toBe(2); // One after Sunday (Oct 4), one after last day (Oct 5)

    const firstSummaryValue = weekSummaryRows[0].querySelector('.week-summary-value')?.textContent?.trim();
    expect(firstSummaryValue).toBe('16.00 h');

    const secondSummaryValue = weekSummaryRows[1].querySelector('.week-summary-value')?.textContent?.trim();
    expect(secondSummaryValue).toBe('6.00 h');
  });
});
