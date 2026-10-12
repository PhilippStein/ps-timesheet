import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectStatsComponent } from './project-stats.component';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetApiService } from '../../services/timesheet-api.service';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectStats } from '../../models/project-stats.model';

describe('ProjectStatsComponent', () => {
  let component: ProjectStatsComponent;
  let fixture: ComponentFixture<ProjectStatsComponent>;
  let state: TimesheetStateService;
  let api: any;

  beforeEach(async () => {
    api = {
      getProjects: vi.fn().mockReturnValue(of([])),
      getProjectTree: vi.fn().mockReturnValue(of({ projectName: 'TestProj', basePath: '/tmp/test', template: 'WorkHours', years: [] })),
      getConfig: vi.fn().mockReturnValue(of({ projects: [] })),
      getProjectStats: vi.fn().mockReturnValue(of(null))
    };

    await TestBed.configureTestingModule({
      imports: [ProjectStatsComponent],
      providers: [
        provideNoopAnimations(),
        TimesheetStateService,
        { provide: TimesheetApiService, useValue: api }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectStatsComponent);
    component = fixture.componentInstance;
    state = TestBed.inject(TimesheetStateService);
    fixture.detectChanges();
  });

  it('should create component and show empty state when no stats present', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-stats-card')).toBeTruthy();
  });

  it('should render annual stats with rates, KPI cards, table and analysis', () => {
    const mockStats: ProjectStats = {
      projectName: 'TestAlpha',
      template: 'WorkHours',
      year: 2026,
      hourlyRate: 95.0,
      totalLoggedUnits: 160.0,
      actualWorkDays: 20,
      possibleWorkDays: 21,
      vacationDays: 1.0,
      sickDays: 0.0,
      holidayDays: 1.0,
      utilizationPercent: 95.24,
      actualRevenueNet: 15200.0,
      maxRevenueNet: 15960.0,
      vacationLossNet: 760.0,
      sickLossNet: 0.0,
      diffRevenueNet: -760.0,
      breakdownRows: [
        {
          label: '01 - Januar',
          periodKey: 1,
          loggedUnits: 160.0,
          actualWorkDays: 20,
          possibleWorkDays: 21,
          vacationDays: 1.0,
          sickDays: 0.0,
          holidayDays: 1.0,
          revenueNet: 15200.0
        }
      ]
    };

    state.projectStats.set(mockStats);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.stats-main-title')?.textContent).toContain('Jahresübersicht 2026');
    expect(compiled.querySelector('.revenue-card')).toBeTruthy();
    expect(compiled.querySelector('.potential-card')).toBeTruthy();
    expect(compiled.querySelector('.workdays-card')?.textContent).toContain('20 / 21 Tage');
    expect(compiled.querySelector('.analysis-card')).toBeTruthy();
    expect(compiled.querySelector('.stats-table tbody tr')).toBeTruthy();
  });

  it('should hide financial cards and analysis when no rate is configured', () => {
    const mockStatsNoRate: ProjectStats = {
      projectName: 'InternalProject',
      template: 'WorkHours',
      year: 2026,
      totalLoggedUnits: 150.0,
      actualWorkDays: 19,
      possibleWorkDays: 21,
      vacationDays: 2.0,
      sickDays: 0.0,
      holidayDays: 0.0,
      utilizationPercent: 90.48,
      breakdownRows: [
        {
          label: '01 - Januar',
          periodKey: 1,
          loggedUnits: 150.0,
          actualWorkDays: 19,
          possibleWorkDays: 21,
          vacationDays: 2.0,
          sickDays: 0.0,
          holidayDays: 0.0
        }
      ]
    };

    state.projectStats.set(mockStatsNoRate);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.revenue-card')).toBeNull();
    expect(compiled.querySelector('.potential-card')).toBeNull();
    expect(compiled.querySelector('.analysis-card')).toBeNull();
    expect(compiled.querySelector('.col-revenue')).toBeNull();
  });

  it('should render task summaries for PersonDays project', () => {
    const mockPersonDaysStats: ProjectStats = {
      projectName: 'DaysAlpha',
      template: 'PersonDays',
      year: null, // Total stats
      dailyRate: 900.0,
      totalLoggedUnits: 10.0,
      actualWorkDays: 10,
      possibleWorkDays: 20,
      vacationDays: 0.0,
      sickDays: 0.0,
      holidayDays: 0.0,
      utilizationPercent: 50.0,
      actualRevenueNet: 9000.0,
      maxRevenueNet: 18000.0,
      diffRevenueNet: -9000.0,
      breakdownRows: [],
      taskSummaries: [
        { taskName: 'Backend Dev', totalPt: 7.0 },
        { taskName: 'Testing', totalPt: 3.0 }
      ]
    };

    state.projectStats.set(mockPersonDaysStats);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.stats-main-title')?.textContent).toContain('Gesamtübersicht (Alle Jahre)');
    expect(compiled.querySelector('.tasks-table-card')).toBeTruthy();
    const taskRows = compiled.querySelectorAll('.tasks-table-card tbody tr');
    expect(taskRows.length).toBe(2);
    expect(taskRows[0].textContent).toContain('Backend Dev');
    expect(taskRows[0].textContent).toContain('7 PT');
    expect(taskRows[0].textContent).toContain('70.0 %');
  });
});
