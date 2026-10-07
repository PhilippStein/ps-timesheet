import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkHoursEditorComponent } from './work-hours-editor.component';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetApiService } from '../../services/timesheet-api.service';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('WorkHoursEditorComponent', () => {
  let component: WorkHoursEditorComponent;
  let fixture: ComponentFixture<WorkHoursEditorComponent>;
  let stateService: TimesheetStateService;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('TimesheetApiService', ['getProjects', 'getProjectTree', 'getMonth', 'saveMonth']);
    apiSpy.getProjects.and.returnValue(of([{ name: 'Test', basePath: '/tmp/test', template: 'WorkHours' }]));
    apiSpy.getProjectTree.and.returnValue(of({ projectName: 'Test', basePath: '/tmp/test', template: 'WorkHours', years: [] }));
    apiSpy.getMonth.and.returnValue(of({
      projectName: 'Test',
      year: 2026,
      month: 10,
      template: 'WorkHours',
      taskColumns: [],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, startTime: '08:00', endTime: '16:30', pauseMinutes: 30 }
      ]
    }));

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
});
