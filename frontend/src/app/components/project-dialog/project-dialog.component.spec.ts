import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProjectDialogComponent } from './project-dialog.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ProjectDialogComponent', () => {
  let component: ProjectDialogComponent;
  let fixture: ComponentFixture<ProjectDialogComponent>;
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogRefSpy = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ProjectDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { isEdit: false } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should validate form and save project data', () => {
    component.name = 'Test Project';
    component.basePath = '/tmp/test';
    component.template = 'PersonDays';
    component.defaultTasks = ['Task 1', 'Task 2'];
    component.defaultNotes = ['Daily', 'Code Review'];
    component.recurringNotes = [
      { text: 'SP Weekly', days: ['Mittwoch'] }
    ];

    expect(component.isValid()).toBe(true);

    component.save();

    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      name: 'Test Project',
      basePath: '/tmp/test',
      template: 'PersonDays',
      defaultTasks: ['Task 1', 'Task 2'],
      defaultNotes: ['Daily', 'Code Review'],
      recurringNotes: [{ text: 'SP Weekly', days: ['Mittwoch'] }]
    });
  });

  it('should allow adding and removing default notes and recurring notes', () => {
    component.template = 'PersonDays';
    component.defaultNotes = ['Daily'];
    component.addDefaultNote();
    expect(component.defaultNotes.length).toBe(2);
    component.removeDefaultNote(0);
    expect(component.defaultNotes.length).toBe(1);

    component.recurringNotes = [];
    component.addRecurringNote();
    expect(component.recurringNotes.length).toBe(1);
    expect(component.recurringNotes[0].days).toEqual(['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']);
    component.removeRecurringNote(0);
    expect(component.recurringNotes.length).toBe(0);
  });
});
