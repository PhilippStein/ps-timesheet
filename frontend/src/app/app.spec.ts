import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { TimesheetApiService } from './services/timesheet-api.service';
import { TimesheetStateService } from './services/timesheet-state.service';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('App', () => {
  beforeEach(async () => {
    const apiSpy = {
      getProjects: vi.fn().mockReturnValue(of([])),
      getProjectTree: vi.fn().mockReturnValue(of({ projectName: '', basePath: '', template: '', years: [] })),
      getMonth: vi.fn().mockReturnValue(of(null)),
      saveMonth: vi.fn().mockReturnValue(of(null))
    };

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
