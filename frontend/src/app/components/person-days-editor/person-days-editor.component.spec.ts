import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonDaysEditorComponent } from './person-days-editor.component';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetApiService } from '../../services/timesheet-api.service';
import { DayStatus } from '../../models/timesheet.model';
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

  it('should exclude vacation and sick days from work days count while keeping PT in total', () => {
    stateService.activeMonthData.set({
      projectName: 'Alpha',
      year: 2026,
      month: 10,
      template: 'PersonDays',
      taskColumns: ['Dev'],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, totalPt: 1.0, notes: null, status: null },
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, totalPt: 0.5, notes: 'Urlaubstag mit Notfall-Einsatz', status: DayStatus.URLAUB },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, totalPt: 0, notes: null, status: null },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, totalPt: 0, notes: null, status: null },
        { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, totalPt: 0, notes: null, status: DayStatus.KRANK },
        { date: '2026-10-06', dayOfWeek: 'Dienstag', isWeekend: false, totalPt: 1.0, notes: 'Normaler Tag', status: null }
      ]
    });

    // 4 weekdays: 1 vacation, 1 sick => 2 regular work days
    expect(component.countTotalWorkDays()).toBe(2);
    // 2 regular work days: 10-01 has 1.0 PT, 10-06 has 1.0 PT => 2 logged work days
    expect(component.countLoggedDays()).toBe(2);
    expect(component.isVacation(stateService.activeMonthData()!.days[1])).toBe(true);
    expect(component.isSick(stateService.activeMonthData()!.days[4])).toBe(true);
  });

  it('should identify empty weekend rows and hide them when setting is enabled', () => {
    const emptyWeekend = { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, totalPt: 0, taskAllocations: {}, notes: null };
    const filledWeekend = { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, totalPt: 0.5, taskAllocations: { 'Dev': 0.5 }, notes: 'Testing' };
    const weekday = { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, totalPt: 0, taskAllocations: {}, notes: null };

    stateService.hideEmptyWeekends.set(false);
    expect(component.isRowHidden(emptyWeekend)).toBe(false);
    expect(component.isRowHidden(filledWeekend)).toBe(false);
    expect(component.isRowHidden(weekday)).toBe(false);

    stateService.hideEmptyWeekends.set(true);
    expect(component.isRowHidden(emptyWeekend)).toBe(true);
    expect(component.isRowHidden(filledWeekend)).toBe(false);
    expect(component.isRowHidden(weekday)).toBe(false);
  });

  it('should skip hidden weekends when finding previous and next visible row index', () => {
    stateService.activeMonthData.set({
      projectName: 'Alpha',
      year: 2026,
      month: 10,
      template: 'PersonDays',
      taskColumns: ['Dev'],
      days: [
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, totalPt: 1.0, taskAllocations: { 'Dev': 1.0 } },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, totalPt: 0, taskAllocations: {} },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, totalPt: 0, taskAllocations: {} },
        { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, totalPt: 0, taskAllocations: {} }
      ]
    });

    stateService.hideEmptyWeekends.set(true);
    expect(component.getPreviousVisibleRowIndex(3)).toBe(0);
    expect(component.getNextVisibleRowIndex(0)).toBe(3);
  });

  it('should identify week separators when weekends are hidden', () => {
    stateService.activeMonthData.set({
      projectName: 'Alpha',
      year: 2026,
      month: 10,
      template: 'PersonDays',
      taskColumns: ['Dev'],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, totalPt: 1.0, taskAllocations: { 'Dev': 1.0 } },
        { date: '2026-10-02', dayOfWeek: 'Freitag', isWeekend: false, totalPt: 1.0, taskAllocations: { 'Dev': 1.0 } },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, totalPt: 0, taskAllocations: {} },
        { date: '2026-10-04', dayOfWeek: 'Sonntag', isWeekend: true, totalPt: 0, taskAllocations: {} },
        { date: '2026-10-05', dayOfWeek: 'Montag', isWeekend: false, totalPt: 1.0, taskAllocations: { 'Dev': 1.0 } },
        { date: '2026-10-06', dayOfWeek: 'Dienstag', isWeekend: false, totalPt: 1.0, taskAllocations: { 'Dev': 1.0 } }
      ]
    });

    stateService.hideEmptyWeekends.set(false);
    expect(component.isWeekSeparator(0)).toBe(false); // First row
    expect(component.isWeekSeparator(1)).toBe(false); // Freitag
    expect(component.isWeekSeparator(4)).toBe(false); // Montag when weekends are visible

    stateService.hideEmptyWeekends.set(true);
    expect(component.isWeekSeparator(0)).toBe(false); // First row
    expect(component.isWeekSeparator(1)).toBe(false); // Same week as Thursday
    expect(component.isWeekSeparator(4)).toBe(true);  // Montag is start of new week after Friday
    expect(component.isWeekSeparator(5)).toBe(false); // Dienstag is same week as Monday
  });

  it('should support adding, removing and formatting bulletpoint notes', () => {
    const day = stateService.activeMonthData()?.days[0];
    expect(day).toBeDefined();
    if (!day) return;

    expect(component.getNotesList(day)).toEqual(['Task 1']);

    component.addNote(day, 'Daily');
    expect(component.getNotesList(day)).toEqual(['Task 1', 'Daily']);
    expect(day.notes).toBe('- Task 1\n- Daily');

    component.removeNote(day, 0);
    expect(component.getNotesList(day)).toEqual(['Daily']);
    expect(day.notes).toBe('- Daily');
  });

  it('should support reordering bulletpoint notes via drag and drop', () => {
    const day = stateService.activeMonthData()?.days[0];
    expect(day).toBeDefined();
    if (!day) return;

    day.notesList = ['First', 'Second', 'Third'];
    day.notes = '- First\n- Second\n- Third';

    component.dropNote(day, { previousIndex: 0, currentIndex: 2 } as any);
    expect(day.notesList).toEqual(['Second', 'Third', 'First']);
    expect(day.notes).toBe('- Second\n- Third\n- First');

    component.dropNote(day, { previousIndex: 1, currentIndex: 0 } as any);
    expect(day.notesList).toEqual(['Third', 'Second', 'First']);
    expect(day.notes).toBe('- Third\n- Second\n- First');
  });

  it('should support cross-day drag and drop copying of notes', () => {
    const day1 = {
      date: '2026-10-01',
      dayOfWeek: 'Donnerstag',
      isWeekend: false,
      notesList: ['Architektur Meeting', 'Dev Sync'],
      notes: '- Architektur Meeting\n- Dev Sync'
    };
    const day2 = {
      date: '2026-10-02',
      dayOfWeek: 'Freitag',
      isWeekend: false,
      notesList: ['Code Review'],
      notes: '- Code Review'
    };

    const container1 = { data: { day: day1, list: day1.notesList } };
    const container2 = { data: { day: day2, list: day2.notesList } };

    // Drag 'Architektur Meeting' (index 0) from day1 and drop onto day2 (index 1)
    component.dropNote(day2, {
      previousContainer: container1,
      container: container2,
      previousIndex: 0,
      currentIndex: 1
    } as any);

    // Source day1 should keep its notes unchanged (copy semantics)
    expect(day1.notesList).toEqual(['Architektur Meeting', 'Dev Sync']);
    expect(day1.notes).toBe('- Architektur Meeting\n- Dev Sync');

    // Target day2 should have the copied note inserted at index 1
    expect(day2.notesList).toEqual(['Code Review', 'Architektur Meeting']);
    expect(day2.notes).toBe('- Code Review\n- Architektur Meeting');
  });

  it('should support inline editing of notes', () => {
    const day = stateService.activeMonthData()?.days[0];
    expect(day).toBeDefined();
    if (!day) return;

    day.notesList = ['Tippfehler Task', 'Review'];
    day.notes = '- Tippfehler Task\n- Review';

    // Start editing note at index 0
    component.startEditNote(day, 0, 'Tippfehler Task');
    expect(component.isEditingNote(day, 0)).toBe(true);
    expect(component.editingNote?.text).toBe('Tippfehler Task');

    // Update text and save
    component.editingNote!.text = 'Korrigierter Task';
    component.saveEditNote(day, 0);

    expect(component.isEditingNote(day, 0)).toBe(false);
    expect(day.notesList).toEqual(['Korrigierter Task', 'Review']);
    expect(day.notes).toBe('- Korrigierter Task\n- Review');

    // Editing and clearing text should remove the note
    component.startEditNote(day, 1, 'Review');
    component.editingNote!.text = '   ';
    component.saveEditNote(day, 1);
    expect(day.notesList).toEqual(['Korrigierter Task']);
    expect(day.notes).toBe('- Korrigierter Task');

    // Canceling edit should discard changes
    component.startEditNote(day, 0, 'Korrigierter Task');
    component.editingNote!.text = 'Wird verworfen';
    component.cancelEditNote();
    expect(component.isEditingNote(day, 0)).toBe(false);
    expect(day.notesList).toEqual(['Korrigierter Task']);
  });

  it('should handle Enter and Escape keys during note editing', () => {
    const day = stateService.activeMonthData()?.days[0];
    expect(day).toBeDefined();
    if (!day) return;

    day.notesList = ['Initialer Text'];
    day.notes = '- Initialer Text';

    component.startEditNote(day, 0, 'Initialer Text');
    component.editingNote!.text = 'Text mit Enter gespeichert';

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventSpy = vi.spyOn(enterEvent, 'preventDefault');
    component.handleEditNoteKeydown(enterEvent, day, 0);

    expect(preventSpy).toHaveBeenCalled();
    expect(component.isEditingNote(day, 0)).toBe(false);
    expect(day.notesList).toEqual(['Text mit Enter gespeichert']);

    // Escape should cancel
    component.startEditNote(day, 0, 'Text mit Enter gespeichert');
    component.editingNote!.text = 'Neuer Text der abgebrochen wird';

    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    component.handleEditNoteKeydown(escEvent, day, 0);
    expect(component.isEditingNote(day, 0)).toBe(false);
    expect(day.notesList).toEqual(['Text mit Enter gespeichert']);
  });

  it('should provide recurring and default notes suggestions', () => {
    stateService.selectedProject.set({
      name: 'Alpha',
      basePath: '/tmp/alpha',
      template: 'PersonDays',
      defaultNotes: ['Daily', 'Code Review'],
      recurringNotes: [
        { text: 'Daily', days: ['Donnerstag', 'Freitag'] },
        { text: 'SP Weekly', days: ['Mittwoch'] },
        { text: 'Dev Weekly', days: ['Donnerstag'] }
      ]
    });

    const day = {
      date: '2026-10-01',
      dayOfWeek: 'Donnerstag',
      isWeekend: false,
      notesList: ['Daily']
    };

    // 'Daily' is already in notesList, so recurring suggestions should only return 'Dev Weekly'
    const recurring = component.getRecurringSuggestions(day);
    expect(recurring).toEqual(['Dev Weekly']);

    // Templates suggestion should return available non-added default & recurring notes
    const templates = component.getAllAvailableTemplateSuggestions(day);
    expect(templates).toContain('Code Review');
    expect(templates).toContain('Dev Weekly');
    expect(templates).toContain('SP Weekly');
    expect(templates).not.toContain('Daily');
  });

  it('should automatically set location to Urlaub or Krank when status changes, and allow manual location selection', () => {
    const day = stateService.activeMonthData()?.days[0];
    expect(day).toBeDefined();
    if (!day) return;

    // Initially no location
    expect(day.location).toBeUndefined();

    // Set location manually
    component.setLocation(day, 'Remote');
    expect(day.location).toBe('Remote');

    component.setLocation(day, 'Vor-Ort');
    expect(day.location).toBe('Vor-Ort');

    // Changing status to Urlaub should set location to Urlaub
    component.setStatus(day, DayStatus.URLAUB);
    expect(day.status).toBe(DayStatus.URLAUB);
    expect(day.location).toBe('Urlaub');

    // Changing status to Krank should set location to Krank
    component.setStatus(day, DayStatus.KRANK);
    expect(day.status).toBe(DayStatus.KRANK);
    expect(day.location).toBe('Krank');

    // Changing status to Feiertag should set location to Feiertag
    component.setStatus(day, DayStatus.FEIERTAG);
    expect(day.status).toBe(DayStatus.FEIERTAG);
    expect(day.location).toBe('Feiertag');
    expect(component.isHoliday(day)).toBe(true);
    expect(component.isVacationOrSick(day)).toBe(true);

    // Resetting status to Regulär (null) should clear location if it was Krank/Urlaub/Feiertag
    component.setStatus(day, null);
    expect(day.status).toBeNull();
    expect(day.location).toBeNull();

    // Setting manual location and then changing status to Regulär should not clear manual location
    component.setLocation(day, 'Remote');
    component.setStatus(day, null);
    expect(day.location).toBe('Remote');

    // Clearing row on a weekday should reset location to 'Remote'
    component.clearRow(0);
    const clearedDay = stateService.activeMonthData()?.days[0];
    expect(clearedDay?.location).toBe('Remote');

    // Clearing row on a weekend should reset location to null
    stateService.activeMonthData.set({
      projectName: 'Alpha',
      year: 2026,
      month: 10,
      template: 'PersonDays',
      taskColumns: ['Dev'],
      days: [
        { date: '2026-10-01', dayOfWeek: 'Donnerstag', isWeekend: false, location: 'Vor-Ort' },
        { date: '2026-10-03', dayOfWeek: 'Samstag', isWeekend: true, location: 'Remote' }
      ]
    });
    component.clearRow(0);
    expect(stateService.activeMonthData()?.days[0].location).toBe('Remote');
    component.clearRow(1);
    expect(stateService.activeMonthData()?.days[1].location).toBeNull();
  });
});
