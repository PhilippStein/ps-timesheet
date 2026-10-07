import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { TimesheetApiService } from './services/timesheet-api.service';
import { TimesheetStateService } from './services/timesheet-state.service';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('App', () => {
  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('TimesheetApiService', ['getProjects', 'getProjectTree', 'getMonth', 'saveMonth']);
    apiSpy.getProjects.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideNoopAnimations(),
        TimesheetStateService,
        { provide: TimesheetApiService, useValue: apiSpy }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
