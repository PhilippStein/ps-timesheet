import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsDialogComponent } from './settings-dialog.component';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetApiService } from '../../services/timesheet-api.service';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SettingsDialogComponent', () => {
  let component: SettingsDialogComponent;
  let fixture: ComponentFixture<SettingsDialogComponent>;
  let stateService: TimesheetStateService;
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const apiSpy = {
      getConfig: vi.fn().mockReturnValue(of({ configPath: '/home/user/.pstimesheet.yaml', projects: [], hideEmptyWeekends: false })),
      updateConfig: vi.fn().mockReturnValue(of({ configPath: '/home/user/.pstimesheet.yaml', projects: [], hideEmptyWeekends: true })),
      getProjects: vi.fn().mockReturnValue(of([]))
    };

    dialogRefSpy = {
      close: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SettingsDialogComponent],
      providers: [
        provideNoopAnimations(),
        TimesheetStateService,
        { provide: TimesheetApiService, useValue: apiSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();

    stateService = TestBed.inject(TimesheetStateService);
    stateService.hideEmptyWeekends.set(false);
    fixture = TestBed.createComponent(SettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with current state setting', () => {
    expect(component.hideEmptyWeekends).toBe(false);
  });

  it('should save setting and close dialog on save()', () => {
    component.hideEmptyWeekends = true;
    component.save();
    expect(stateService.hideEmptyWeekends()).toBe(true);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });
});
