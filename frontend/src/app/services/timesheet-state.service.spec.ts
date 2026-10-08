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
      saveMonth: vi.fn().mockReturnValue(of(mockMonthData))
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
});
