import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface TaskColumnsDialogData {
  projectName: string;
  year: number;
  month: number;
  taskColumns: string[];
}

@Component({
  selector: 'app-task-columns-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Aufgaben für {{ data.year }}-{{ data.month < 10 ? '0' + data.month : data.month }} anpassen</h2>
    <mat-dialog-content>
      <p class="dialog-hint">
        Spalten für diesen konkreten Monat bearbeiten. Vorhandene Zeiterfassungen bleiben erhalten.
      </p>

      <div class="tasks-container">
        @for (task of tasks; track $index) {
          <div class="task-row">
            <span class="task-num">{{ $index + 1 }}.</span>
            <mat-form-field appearance="outline" class="task-field">
              <input matInput [(ngModel)]="tasks[$index]" placeholder="Aufgabenname">
            </mat-form-field>
            <button mat-icon-button color="warn" (click)="removeTask($index)" [disabled]="tasks.length <= 1" type="button">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        }
      </div>

      <button mat-stroked-button color="primary" (click)="addTask()" type="button" class="add-btn">
        <mat-icon>add</mat-icon> Spalte hinzufügen
      </button>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Abbrechen</button>
      <button mat-flat-button color="primary" [disabled]="!isValid()" (click)="save()">Übernehmen</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-hint {
      color: #6c757d;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .tasks-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 400px;
      max-height: 380px;
      overflow-y: auto;
    }
    .task-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .task-num {
      font-size: 13px;
      font-weight: 500;
      color: #868e96;
      width: 24px;
    }
    .task-field {
      flex: 1;
      margin-bottom: -16px;
    }
    .add-btn {
      margin-top: 16px;
    }
  `]
})
export class TaskColumnsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<TaskColumnsDialogComponent>);
  readonly data: TaskColumnsDialogData = inject(MAT_DIALOG_DATA);

  tasks: string[] = this.data.taskColumns ? [...this.data.taskColumns] : ['Aufgabe 1'];

  addTask() {
    this.tasks.push(`Neue Aufgabe ${this.tasks.length + 1}`);
  }

  removeTask(index: number) {
    if (this.tasks.length > 1) {
      this.tasks.splice(index, 1);
    }
  }

  isValid(): boolean {
    return this.tasks.some(t => t.trim().length > 0);
  }

  save() {
    const cleaned = this.tasks.map(t => t.trim()).filter(t => t.length > 0);
    this.dialogRef.close(cleaned);
  }
}
