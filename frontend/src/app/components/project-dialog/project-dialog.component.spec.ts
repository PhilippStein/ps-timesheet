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
    component.dailyRate = 950;
    component.pdfHeaderTitle = 'Custom Header';
    component.pdfFooterText = 'Custom Footer Text';
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
      hourlyRate: undefined,
      dailyRate: 950,
      pdfHeaderTitle: 'Custom Header',
      pdfFooterText: 'Custom Footer Text',
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

  it('should support reordering default tasks, default notes and recurring notes via drag and drop', () => {
    component.defaultTasks = ['Task A', 'Task B', 'Task C'];
    component.dropTask({ previousIndex: 0, currentIndex: 2 } as any);
    expect(component.defaultTasks).toEqual(['Task B', 'Task C', 'Task A']);

    component.defaultNotes = ['Note 1', 'Note 2', 'Note 3'];
    component.dropDefaultNote({ previousIndex: 2, currentIndex: 0 } as any);
    expect(component.defaultNotes).toEqual(['Note 3', 'Note 1', 'Note 2']);

    component.recurringNotes = [
      { text: 'Rec 1', days: ['Montag'] },
      { text: 'Rec 2', days: ['Dienstag'] }
    ];
    component.dropRecurringNote({ previousIndex: 0, currentIndex: 1 } as any);
    expect(component.recurringNotes).toEqual([
      { text: 'Rec 2', days: ['Dienstag'] },
      { text: 'Rec 1', days: ['Montag'] }
    ]);
  });

  it('should confirm delete and close dialog with delete payload in edit mode', () => {
    component.name = 'ProjectToDelete';
    component.confirmDelete();

    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      delete: true,
      projectName: 'ProjectToDelete'
    });
  });
});
