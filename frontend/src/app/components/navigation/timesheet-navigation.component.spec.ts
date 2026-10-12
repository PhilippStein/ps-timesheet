import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimesheetNavigationComponent } from './timesheet-navigation.component';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetApiService } from '../../services/timesheet-api.service';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('TimesheetNavigationComponent', () => {
  let component: TimesheetNavigationComponent;
  let fixture: ComponentFixture<TimesheetNavigationComponent>;
  let state: TimesheetStateService;
  let api: any;
  let matDialog: MatDialog;

  beforeEach(async () => {
    api = {
      getProjects: vi.fn().mockReturnValue(of([{ name: 'TestProj', basePath: '/tmp/test', template: 'WorkHours' }])),
      getProjectTree: vi.fn().mockReturnValue(of({ projectName: 'TestProj', basePath: '/tmp/test', template: 'WorkHours', years: [] })),
      getMonth: vi.fn().mockReturnValue(of(null)),
      saveMonth: vi.fn().mockReturnValue(of(null)),
      saveProject: vi.fn().mockReturnValue(of({ name: 'UpdatedProj', basePath: '/tmp/test', template: 'WorkHours' })),
      deleteProject: vi.fn().mockReturnValue(of(undefined)),
      getConfig: vi.fn().mockReturnValue(of({ projects: [{ name: 'TestProj', basePath: '/tmp/test', template: 'WorkHours' }] })),
      downloadPdf: vi.fn().mockReturnValue(of(new Blob(['pdf content'], { type: 'application/pdf' })))
    };

    await TestBed.configureTestingModule({
      imports: [TimesheetNavigationComponent],
      providers: [
        provideNoopAnimations(),
        TimesheetStateService,
        { provide: TimesheetApiService, useValue: api }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimesheetNavigationComponent);
    component = fixture.componentInstance;
    state = TestBed.inject(TimesheetStateService);
    matDialog = TestBed.inject(MatDialog);
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

  it('should trigger PDF download on exportMonthPdf', () => {
    state.selectedProject.set({ name: 'TestProj', basePath: '/tmp/test', template: 'WorkHours' });
    state.selectedYear.set(2026);

    const event = new MouseEvent('click');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
    const exportPdfSpy = vi.spyOn(state, 'exportPdf');

    component.exportMonthPdf(10, event);

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(exportPdfSpy).toHaveBeenCalledWith(10);
  });

  it('should handle project deletion when requested from edit dialog', () => {
    const project = { name: 'ToDelete', basePath: '/tmp/test', template: 'WorkHours' };
    const dialogRefSpy = {
      afterClosed: () => of({ delete: true, projectName: 'ToDelete' })
    };
    const openSpy = vi.spyOn((component as any).dialog, 'open').mockReturnValue(dialogRefSpy as any);
    const loadConfigSpy = vi.spyOn(state, 'loadConfig');

    const event = new MouseEvent('click');
    component.openEditProjectDialog(project, event);

    expect(openSpy).toHaveBeenCalled();
    expect(api.deleteProject).toHaveBeenCalledWith('ToDelete');
    expect(loadConfigSpy).toHaveBeenCalled();
  });
});
