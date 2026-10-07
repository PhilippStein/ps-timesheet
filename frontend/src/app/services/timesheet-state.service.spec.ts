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

  it('should initialize and load projects', () => {
    expect(service.projects().length).toBe(2);
    expect(service.selectedProject()?.name).toBe('ProjHours');
  });

  it('should duplicate day data correctly for WorkHours', () => {
    service.activeMonthData.set(JSON.parse(JSON.stringify(mockMonthData)));
    service.duplicateDay(0, 1);

    const targetDay = service.activeMonthData()?.days[1];
    expect(targetDay?.startTime).toBe('08:30');
    expect(targetDay?.endTime).toBe('17:00');
    expect(targetDay?.pauseMinutes).toBe(30);
  });
});
