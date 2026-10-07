import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonDaysEditorComponent } from './person-days-editor.component';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetApiService } from '../../services/timesheet-api.service';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PersonDaysEditorComponent', () => {
  let component: PersonDaysEditorComponent;
  let fixture: ComponentFixture<PersonDaysEditorComponent>;
  let stateService: TimesheetStateService;

  beforeEach(async () => {
    const apiSpy = {
      getProjects: vi.fn().mockReturnValue(of([{ name: 'Alpha', basePath: '/tmp/alpha', template: 'PersonDays', defaultTasks: ['Dev', 'QA'] }])),
      getProjectTree: vi.fn().mockReturnValue(of({ projectName: 'Alpha', basePath: '/tmp/alpha', template: 'PersonDays', years: [] })),
      getMonth: vi.fn().mockReturnValue(of({
        projectName: 'Alpha',
        year: 2026,
        month: 10,
        template: 'PersonDays',
        taskColumns: ['Dev', 'QA'],
        days: [
          { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, taskAllocations: { 'Dev': 0.5, 'QA': 0.5 }, notes: '- Task 1' }
        ]
      })),
      saveMonth: vi.fn().mockReturnValue(of(null))
    };

    await TestBed.configureTestingModule({
      imports: [PersonDaysEditorComponent],
      providers: [
        provideNoopAnimations(),
        TimesheetStateService,
        { provide: TimesheetApiService, useValue: apiSpy }
      ]
    }).compileComponents();

    stateService = TestBed.inject(TimesheetStateService);
    fixture = TestBed.createComponent(PersonDaysEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should read and write task person-days', () => {
    const day = stateService.activeMonthData()?.days[0];
    if (day) {
      expect(component.getTaskPt(day, 'Dev')).toBe(0.5);
      component.setTaskPt(day, 'Dev', 0.8);
      expect(component.getTaskPt(day, 'Dev')).toBe(0.8);
    }
  });

  it('should calculate logged workdays excluding weekends', () => {
    stateService.activeMonthData.set({
      projectName: 'Alpha',
      year: 2026,
      month: 10,
      template: 'PersonDays',
      taskColumns: ['Dev'],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, totalPt: 1.0, notes: null },
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, totalPt: 0, notes: '' },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, totalPt: 1.0, notes: 'Weekend work' },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, totalPt: 0, notes: null }
      ]
    });

    expect(component.countTotalWorkDays()).toBe(2);
    expect(component.countLoggedDays()).toBe(1);
  });
});
