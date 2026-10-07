import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonDaysEditorComponent } from './person-days-editor.component';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetApiService } from '../../services/timesheet-api.service';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('PersonDaysEditorComponent', () => {
  let component: PersonDaysEditorComponent;
  let fixture: ComponentFixture<PersonDaysEditorComponent>;
  let stateService: TimesheetStateService;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('TimesheetApiService', ['getProjects', 'getProjectTree', 'getMonth', 'saveMonth']);
    apiSpy.getProjects.and.returnValue(of([{ name: 'Alpha', basePath: '/tmp/alpha', template: 'PersonDays', defaultTasks: ['Dev', 'QA'] }]));
    apiSpy.getProjectTree.and.returnValue(of({ projectName: 'Alpha', basePath: '/tmp/alpha', template: 'PersonDays', years: [] }));
    apiSpy.getMonth.and.returnValue(of({
      projectName: 'Alpha',
      year: 2026,
      month: 10,
      template: 'PersonDays',
      taskColumns: ['Dev', 'QA'],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, taskAllocations: { 'Dev': 0.5, 'QA': 0.5 }, notes: '- Task 1' }
      ]
    }));

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
});
