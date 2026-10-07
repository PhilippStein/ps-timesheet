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
import { ProjectConfig } from '../../models/project.model';

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
    MatChipsModule
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
          <div class="tasks-section">
            <label class="section-label">Standard-Aufgaben (für neue Monate):</label>
            <div class="tasks-list">
              @for (task of defaultTasks; track $index) {
                <div class="task-row">
                  <mat-form-field appearance="outline" class="task-input">
                    <input matInput [(ngModel)]="defaultTasks[$index]" placeholder="Aufgabenname">
                  </mat-form-field>
                  <button mat-icon-button color="warn" (click)="removeTask($index)" type="button">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>
            <button mat-stroked-button color="primary" (click)="addTask()" type="button" class="add-task-btn">
              <mat-icon>add</mat-icon> Aufgabe hinzufügen
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
      min-width: 480px;
      max-width: 600px;
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
    .tasks-section {
      background: #f1f3f5;
      padding: 12px;
      border-radius: 6px;
    }
    .task-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .task-input {
      flex: 1;
      margin-bottom: -16px;
    }
    .add-task-btn {
      margin-top: 8px;
    }
  `]
})
export class ProjectDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProjectDialogComponent>);
  readonly data: ProjectDialogData = inject(MAT_DIALOG_DATA);

  name = this.data.project?.name ?? '';
  basePath = this.data.project?.basePath ?? '';
  template = this.data.project?.template ?? 'WorkHours';
  defaultTasks: string[] = this.data.project?.defaultTasks ? [...this.data.project.defaultTasks] : ['Konzeption', 'Entwicklung', 'Review & Test'];

  addTask() {
    this.defaultTasks.push(`Aufgabe ${this.defaultTasks.length + 1}`);
  }

  removeTask(index: number) {
    this.defaultTasks.splice(index, 1);
  }

  isValid(): boolean {
    return this.name.trim().length > 0 && this.basePath.trim().length > 0;
  }

  save() {
    const cleanTasks = this.template === 'PersonDays'
      ? this.defaultTasks.map(t => t.trim()).filter(t => t.length > 0)
      : [];

    const result: ProjectConfig = {
      name: this.name.trim(),
      basePath: this.basePath.trim(),
      template: this.template,
      defaultTasks: cleanTasks
    };

    this.dialogRef.close(result);
  }
}
