import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ProjectConfig, RecurringNoteConfig } from '../../models/project.model';

export interface ProjectDialogData {
  project?: ProjectConfig;
  isEdit: boolean;
}

@Component({
  selector: 'app-project-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatChipsModule,
    DragDropModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.isEdit ? 'Projekteinstellungen' : 'Neues Projekt erstellen' }}</h2>
    <mat-dialog-content class="dialog-content">
      <div class="form-container">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Projektname</mat-label>
          <input matInput [(ngModel)]="name" [disabled]="data.isEdit" required placeholder="z.B. Blubb">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Speicherpfad (Basepath)</mat-label>
          <input matInput [(ngModel)]="basePath" required placeholder="z.B. ~/timesheets/Blubb">
          <mat-hint>Dateien werden unter &lt;Basepath&gt;/&lt;yyyy&gt;/ abgelegt</mat-hint>
        </mat-form-field>

        <div class="template-selection">
          <label class="section-label">Zeiterfassungs-Vorlage:</label>
          <mat-radio-group [(ngModel)]="template" class="radio-group">
            <mat-radio-button value="WorkHours">
              <div class="radio-option">
                <strong>WorkHours (Arbeitszeit)</strong>
                <span class="text-muted">Startzeit, Endzeit, Pause, Kommentar &amp; Netto-Stunden</span>
              </div>
            </mat-radio-button>
            <mat-radio-button value="PersonDays">
              <div class="radio-option">
                <strong>PersonDays (Personentage)</strong>
                <span class="text-muted">Personentage (PT) pro Aufgabe &amp; tägliche Bulletpoint-Notizen</span>
              </div>
            </mat-radio-button>
          </mat-radio-group>
        </div>

        @if (template === 'PersonDays') {
          <div class="config-section">
            <label class="section-label">Standard-Aufgaben (für neue Monate):</label>
            <div class="items-list" cdkDropList (cdkDropListDropped)="dropTask($event)">
              @for (task of defaultTasks; track $index) {
                <div class="item-row" cdkDrag>
                  <mat-icon cdkDragHandle class="drag-handle" title="Verschieben">drag_indicator</mat-icon>
                  <mat-form-field appearance="outline" class="item-input">
                    <input matInput [(ngModel)]="defaultTasks[$index]" placeholder="Aufgabenname">
                  </mat-form-field>
                  <button mat-icon-button color="warn" (click)="removeTask($index)" type="button">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>
            <button mat-stroked-button color="primary" (click)="addTask()" type="button" class="add-btn">
              <mat-icon>add</mat-icon> Aufgabe hinzufügen
            </button>
          </div>

          <div class="config-section">
            <label class="section-label">Standard-Notizen / Vorlagen (Quick-Add):</label>
            <div class="items-list" cdkDropList (cdkDropListDropped)="dropDefaultNote($event)">
              @for (note of defaultNotes; track $index) {
                <div class="item-row" cdkDrag>
                  <mat-icon cdkDragHandle class="drag-handle" title="Verschieben">drag_indicator</mat-icon>
                  <mat-form-field appearance="outline" class="item-input">
                    <input matInput [(ngModel)]="defaultNotes[$index]" placeholder="z.B. Daily, Code Review, Release">
                  </mat-form-field>
                  <button mat-icon-button color="warn" (click)="removeDefaultNote($index)" type="button">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>
            <button mat-stroked-button color="primary" (click)="addDefaultNote()" type="button" class="add-btn">
              <mat-icon>add</mat-icon> Vorlage hinzufügen
            </button>
          </div>

          <div class="config-section">
            <label class="section-label">Wiederkehrende Notizen (nach Wochentag):</label>
            <div class="items-list" cdkDropList (cdkDropListDropped)="dropRecurringNote($event)">
              @for (recurring of recurringNotes; track $index) {
                <div class="recurring-row" cdkDrag>
                  <mat-icon cdkDragHandle class="drag-handle" title="Verschieben">drag_indicator</mat-icon>
                  <mat-form-field appearance="outline" class="recurring-text-input">
                    <mat-label>Notiz-Text</mat-label>
                    <input matInput [(ngModel)]="recurring.text" placeholder="z.B. SP Weekly, Daily">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="recurring-days-select">
                    <mat-label>Wochentage</mat-label>
                    <mat-select [(ngModel)]="recurring.days" multiple>
                      @for (day of availableWeekdays; track day) {
                        <mat-option [value]="day">{{ day }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <button mat-icon-button color="warn" (click)="removeRecurringNote($index)" type="button" class="recurring-delete-btn">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>
            <button mat-stroked-button color="primary" (click)="addRecurringNote()" type="button" class="add-btn">
              <mat-icon>add</mat-icon> Wiederkehrende Notiz hinzufügen
            </button>
          </div>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Abbrechen</button>
      <button mat-flat-button color="primary" [disabled]="!isValid()" (click)="save()">Speichern</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      min-width: 520px;
      max-width: 650px;
      max-height: 80vh;
    }
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 8px;
    }
    .full-width {
      width: 100%;
    }
    .section-label {
      display: block;
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .radio-option {
      display: flex;
      flex-direction: column;
      margin-left: 8px;
    }
    .config-section {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      padding: 12px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .item-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .drag-handle {
      cursor: grab;
      color: #adb5bd;
      font-size: 20px;
      width: 20px;
      height: 20px;
      line-height: 20px;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &:hover {
        color: #495057;
      }

      &:active {
        cursor: grabbing;
      }
    }
    .item-input {
      flex: 1;
      margin-bottom: -16px;
    }
    .recurring-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .recurring-text-input {
      flex: 1.2;
      margin-bottom: -16px;
    }
    .recurring-days-select {
      flex: 1.3;
      margin-bottom: -16px;
    }
    .recurring-delete-btn {
      align-self: center;
    }
    .add-btn {
      align-self: flex-start;
      margin-top: 6px;
    }
  `]
})
export class ProjectDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProjectDialogComponent>);
  readonly data: ProjectDialogData = inject(MAT_DIALOG_DATA);

  readonly availableWeekdays = [
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
    'Sonntag'
  ];

  name = this.data.project?.name ?? '';
  basePath = this.data.project?.basePath ?? '';
  template = this.data.project?.template ?? 'WorkHours';
  defaultTasks: string[] = this.data.project?.defaultTasks ? [...this.data.project.defaultTasks] : ['Konzeption', 'Entwicklung', 'Review & Test'];
  defaultNotes: string[] = this.data.project?.defaultNotes ? [...this.data.project.defaultNotes] : [];
  recurringNotes: RecurringNoteConfig[] = this.data.project?.recurringNotes
    ? this.data.project.recurringNotes.map(r => ({ text: r.text, days: [...(r.days || [])] }))
    : [];

  addTask() {
    this.defaultTasks.push(`Aufgabe ${this.defaultTasks.length + 1}`);
  }

  removeTask(index: number) {
    this.defaultTasks.splice(index, 1);
  }

  dropTask(event: CdkDragDrop<string[]>) {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.defaultTasks, event.previousIndex, event.currentIndex);
    this.defaultTasks = [...this.defaultTasks];
  }

  addDefaultNote() {
    this.defaultNotes.push('');
  }

  removeDefaultNote(index: number) {
    this.defaultNotes.splice(index, 1);
  }

  dropDefaultNote(event: CdkDragDrop<string[]>) {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.defaultNotes, event.previousIndex, event.currentIndex);
    this.defaultNotes = [...this.defaultNotes];
  }

  addRecurringNote() {
    this.recurringNotes.push({
      text: '',
      days: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
    });
  }

  removeRecurringNote(index: number) {
    this.recurringNotes.splice(index, 1);
  }

  dropRecurringNote(event: CdkDragDrop<RecurringNoteConfig[]>) {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.recurringNotes, event.previousIndex, event.currentIndex);
    this.recurringNotes = [...this.recurringNotes];
  }

  isValid(): boolean {
    return this.name.trim().length > 0 && this.basePath.trim().length > 0;
  }

  save() {
    const cleanTasks = this.template === 'PersonDays'
      ? this.defaultTasks.map(t => t.trim()).filter(t => t.length > 0)
      : [];

    const cleanDefaultNotes = this.template === 'PersonDays'
      ? this.defaultNotes.map(n => n.trim()).filter(n => n.length > 0)
      : [];

    const cleanRecurringNotes = this.template === 'PersonDays'
      ? this.recurringNotes
          .map(r => ({ text: r.text.trim(), days: r.days || [] }))
          .filter(r => r.text.length > 0 && r.days.length > 0)
      : [];

    const result: ProjectConfig = {
      name: this.name.trim(),
      basePath: this.basePath.trim(),
      template: this.template,
      defaultTasks: cleanTasks,
      defaultNotes: cleanDefaultNotes,
      recurringNotes: cleanRecurringNotes
    };

    this.dialogRef.close(result);
  }
}
