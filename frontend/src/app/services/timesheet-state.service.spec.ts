import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TimesheetStateService } from './timesheet-state.service';
import { TimesheetApiService } from './timesheet-api.service';
import { ProjectConfig, ProjectTreeDTO } from '../models/project.model';
import { TimesheetMonth } from '../models/timesheet.model';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('TimesheetStateService', () => {
  let service: TimesheetStateService;
  let apiSpy: {
    getConfig: ReturnType<typeof vi.fn>;
    updateConfig: ReturnType<typeof vi.fn>;
    getProjects: ReturnType<typeof vi.fn>;
    getProjectTree: ReturnType<typeof vi.fn>;
    getMonth: ReturnType<typeof vi.fn>;
    saveMonth: ReturnType<typeof vi.fn>;
    getProjectStats: ReturnType<typeof vi.fn>;
  };

  const mockProjects: ProjectConfig[] = [
    { name: 'ProjHours', basePath: '/tmp/hours', template: 'WorkHours' },
    { name: 'ProjDays', basePath: '/tmp/days', template: 'PersonDays', defaultTasks: ['Dev', 'QA'] }
  ];

  const mockTree: ProjectTreeDTO = {
    projectName: 'ProjHours',
    basePath: '/tmp/hours',
    template: 'WorkHours',
    years: [
      {
        year: 2026,
        months: [
          { month: 10, monthName: 'Oktober', exists: true, fileName: '2026_10_ProjHours_WorkHours.csv' }
        ]
      }
    ]
  };

  const mockMonthData: TimesheetMonth = {
    projectName: 'ProjHours',
    year: 2026,
    month: 10,
    template: 'WorkHours',
    taskColumns: [],
    days: [
      { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, startTime: '08:30', endTime: '17:00', pauseMinutes: 30 },
      { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, startTime: '09:00', endTime: '17:00', pauseMinutes: 60 }
    ]
  };

  beforeEach(() => {
    apiSpy = {
      getConfig: vi.fn().mockReturnValue(of({ configPath: '/home/user/.pstimesheet.yaml', projects: mockProjects, hideEmptyWeekends: false })),
      updateConfig: vi.fn().mockReturnValue(of({ configPath: '/home/user/.pstimesheet.yaml', projects: mockProjects, hideEmptyWeekends: true })),
      getProjects: vi.fn().mockReturnValue(of(mockProjects)),
      getProjectTree: vi.fn().mockReturnValue(of(mockTree)),
      getMonth: vi.fn().mockReturnValue(of(mockMonthData)),
      saveMonth: vi.fn().mockReturnValue(of(mockMonthData)),
      getProjectStats: vi.fn().mockReturnValue(of({ projectName: 'ProjHours', template: 'WorkHours', totalLoggedUnits: 10, actualWorkDays: 2, possibleWorkDays: 20, vacationDays: 0, sickDays: 0, holidayDays: 0, utilizationPercent: 10, breakdownRows: [] }))
    };

    TestBed.configureTestingModule({
      providers: [
        TimesheetStateService,
        { provide: TimesheetApiService, useValue: apiSpy }
      ]
    });

    service = TestBed.inject(TimesheetStateService);
  });

  it('should initialize and load projects and config', () => {
    expect(service.projects().length).toBe(2);
    expect(service.selectedProject()?.name).toBe('ProjHours');
    expect(service.configPath()).toBe('/home/user/.pstimesheet.yaml');
    expect(service.hideEmptyWeekends()).toBe(false);
  });

  it('should update global settings for hideEmptyWeekends', () => {
    service.saveGlobalSettings(true).subscribe();
    expect(apiSpy.updateConfig).toHaveBeenCalledWith({
      projects: mockProjects,
      hideEmptyWeekends: true
    });
    expect(service.hideEmptyWeekends()).toBe(true);
  });

  it('should duplicate day data correctly for WorkHours', () => {
    service.activeMonthData.set(JSON.parse(JSON.stringify(mockMonthData)));
    service.duplicateDay(0, 1);

    const targetDay = service.activeMonthData()?.days[1];
    expect(targetDay?.startTime).toBe('08:30');
    expect(targetDay?.endTime).toBe('17:00');
    expect(targetDay?.pauseMinutes).toBe(30);
  });

  it('should duplicate day data correctly for PersonDays including location and notesList', () => {
    const personDaysMonth: TimesheetMonth = {
      projectName: 'ProjDays',
      year: 2026,
      month: 10,
      template: 'PersonDays',
      taskColumns: ['Dev'],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, location: 'Remote', status: null, taskAllocations: { 'Dev': 1.0 }, notes: '- Daily', notesList: ['Daily'] },
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false }
      ]
    };
    service.activeMonthData.set(JSON.parse(JSON.stringify(personDaysMonth)));
    service.duplicateDay(0, 1);

    const targetDay = service.activeMonthData()?.days[1];
    expect(targetDay?.location).toBe('Remote');
    expect(targetDay?.taskAllocations).toEqual({ 'Dev': 1.0 });
    expect(targetDay?.notesList).toEqual(['Daily']);
  });

  it('should refresh selectedProject when config is reloaded with updated project data', () => {
    const updatedProjects: ProjectConfig[] = [
      {
        name: 'ProjHours',
        basePath: '/tmp/hours',
        template: 'WorkHours',
        defaultNotes: ['Daily', 'Review'],
        recurringNotes: [{ text: 'SP Weekly', days: ['Mittwoch'] }]
      },
      { name: 'ProjDays', basePath: '/tmp/days', template: 'PersonDays' }
    ];

    apiSpy.getConfig.mockReturnValue(of({
      configPath: '/home/user/.pstimesheet.yaml',
      projects: updatedProjects,
      hideEmptyWeekends: false
    }));

    service.loadConfig();

    expect(service.selectedProject()?.name).toBe('ProjHours');
    expect(service.selectedProject()?.defaultNotes).toEqual(['Daily', 'Review']);
    expect(service.selectedProject()?.recurringNotes).toEqual([{ text: 'SP Weekly', days: ['Mittwoch'] }]);
  });

  it('should toggle navigation collapse state', () => {
    expect(service.isNavCollapsed()).toBe(false);
    service.toggleNavCollapsed();
    expect(service.isNavCollapsed()).toBe(true);
    service.toggleNavCollapsed();
    expect(service.isNavCollapsed()).toBe(false);
  });

  it('should switch view to year-stats and project-stats and reset to month-editor on selectMonth', () => {
    service.showYearStats(2026);
    expect(service.activeView()).toBe('year-stats');
    expect(service.selectedYear()).toBe(2026);
    expect(service.selectedMonth()).toBeNull();
    expect(apiSpy.getProjectStats).toHaveBeenCalledWith('ProjHours', 2026);

    service.showProjectStats();
    expect(service.activeView()).toBe('project-stats');
    expect(service.selectedYear()).toBeNull();
    expect(service.selectedMonth()).toBeNull();
    expect(apiSpy.getProjectStats).toHaveBeenCalledWith('ProjHours', null);

    service.selectedYear.set(2026);
    service.selectMonth(10);
    expect(service.activeView()).toBe('month-editor');
    expect(service.selectedMonth()).toBe(10);
  });

  it('should not overwrite activeMonthData when delayed auto-save completes for previous project', async () => {
    vi.useFakeTimers();

    const projDaysMonth: TimesheetMonth = {
      projectName: 'ProjDays',
      year: 2026,
      month: 10,
      template: 'PersonDays',
      taskColumns: ['Dev'],
      days: []
    };

    // User is on ProjHours and updates month data
    service.activeMonthData.set(JSON.parse(JSON.stringify(mockMonthData)));
    service.updateActiveMonthData(data => {
      data.days[0].comment = 'Updated in Other';
    });

    // User switches to ProjDays before debounce fires
    apiSpy.getMonth.mockReturnValue(of(projDaysMonth));
    service.selectProject(mockProjects[1]);
    expect(service.selectedProject()?.name).toBe('ProjDays');
    expect(service.activeMonthData()?.projectName).toBe('ProjDays');

    // Debounce timer (400ms) elapses and save response returns for ProjHours
    await vi.advanceTimersByTimeAsync(500);

    // activeMonthData must STILL be ProjDays, not overwritten by ProjHours!
    expect(service.activeMonthData()?.projectName).toBe('ProjDays');

    vi.useRealTimers();
  });

  it('should ignore stale getMonth response if user navigated away before response arrived', () => {
    service.selectedProject.set(mockProjects[0]);
    service.selectedYear.set(2026);
    service.selectedMonth.set(10);
    service.activeMonthData.set(mockMonthData);

    // Stale response from month 9 arrives
    const month9Data: TimesheetMonth = {
      projectName: 'ProjHours',
      year: 2026,
      month: 9,
      template: 'WorkHours',
      taskColumns: [],
      days: []
    };
    apiSpy.getMonth.mockReturnValue(of(month9Data));

    // Calling loadActiveMonth for month 9 when selectedMonth is already 10
    service.loadActiveMonth('ProjHours', 2026, 9);

    // activeMonthData should NOT be replaced by month 9
    expect(service.activeMonthData()?.month).toBe(10);
  });
});
