import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimesheetNavigationComponent } from './timesheet-navigation.component';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetApiService } from '../../services/timesheet-api.service';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('TimesheetNavigationComponent', () => {
  let component: TimesheetNavigationComponent;
  let fixture: ComponentFixture<TimesheetNavigationComponent>;
  let state: TimesheetStateService;

  beforeEach(async () => {
    const apiSpy = {
      getProjects: vi.fn().mockReturnValue(of([{ name: 'TestProj', basePath: '/tmp/test', template: 'WorkHours' }])),
      getProjectTree: vi.fn().mockReturnValue(of({ projectName: 'TestProj', basePath: '/tmp/test', template: 'WorkHours', years: [] })),
      getMonth: vi.fn().mockReturnValue(of(null)),
      saveMonth: vi.fn().mockReturnValue(of(null)),
      saveProject: vi.fn().mockReturnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [TimesheetNavigationComponent],
      providers: [
        provideNoopAnimations(),
        TimesheetStateService,
        { provide: TimesheetApiService, useValue: apiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimesheetNavigationComponent);
    component = fixture.componentInstance;
    state = TestBed.inject(TimesheetStateService);
    fixture.detectChanges();
  });

  it('should create navigation component', () => {
    expect(component).toBeTruthy();
  });

  it('should render collapse button and toggle collapse state when clicked', () => {
    expect(state.isNavCollapsed()).toBe(false);
    
    // Check expanded view
    const compiled = fixture.nativeElement as HTMLElement;
    const collapseBtn = compiled.querySelector('.collapse-toggle-btn') as HTMLButtonElement;
    expect(collapseBtn).toBeTruthy();

    // Click collapse
    collapseBtn.click();
    fixture.detectChanges();

    expect(state.isNavCollapsed()).toBe(true);
    expect(compiled.querySelector('.collapsed-strip')).toBeTruthy();

    // Click expand
    const expandBtn = compiled.querySelector('.collapsed-strip .collapse-toggle-btn') as HTMLButtonElement;
    expect(expandBtn).toBeTruthy();
    expandBtn.click();
    fixture.detectChanges();

    expect(state.isNavCollapsed()).toBe(false);
    expect(compiled.querySelector('.projects-column')).toBeTruthy();
  });
});
