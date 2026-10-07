import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TextFieldModule } from '@angular/cdk/text-field';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetDay } from '../../models/timesheet.model';
import { TaskColumnsDialogComponent } from '../task-columns-dialog/task-columns-dialog.component';

@Component({
  selector: 'app-person-days-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    TextFieldModule
  ],
  template: `
    <div class="editor-container" (keydown)="handleGlobalKeydown($event)">
      <!-- HEADER METRICS BAR -->
      <div class="metrics-bar">
        <div class="metric-item">
          <span class="metric-label">Monats-Gesamt PT:</span>
          <span class="metric-value font-mono">{{ formatPt(state.activeMonthData()?.totalPt) }} PT</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Erfasste Arbeitstage:</span>
          <span class="metric-value font-mono">{{ countLoggedDays() }} / {{ countTotalWorkDays() }}</span>
        </div>

        <button mat-stroked-button color="primary" class="edit-tasks-btn" (click)="openEditTasksDialog()">
          <mat-icon>view_column</mat-icon> Aufgaben anpassen ({{ state.activeMonthData()?.taskColumns?.length || 0 }})
        </button>

        <div class="shortcut-hints">
          <span class="hint-tag"><kbd>Ctrl+D</kbd> Vortag kopieren</span>
          <span class="hint-tag"><kbd>Enter</kbd> Nächster Tag / Zeile</span>
        </div>
      </div>

      <!-- TIMESHEET TABLE -->
      <div class="table-scroll-wrapper">
        <table class="timesheet-table">
          <thead>
            <tr>
              <th class="col-date">Datum</th>
              @for (task of state.activeMonthData()?.taskColumns; track task; let taskIndex = $index) {
                <th class="col-task font-mono" [matTooltip]="task">
                  <span class="task-header-text">{{ task }}</span>
                </th>
              }
              <th class="col-pt font-mono">Total PT</th>
              <th class="col-notes">Tages-Notizen / Bulletpoints</th>
              <th class="col-actions">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            @for (day of state.activeMonthData()?.days; track day.date; let rowIndex = $index) {
              <tr [class.weekend-row]="day.isWeekend || day.weekend" [class.has-hours]="day.totalPt && day.totalPt > 0">
                <td class="col-date">
                  <div class="date-day-cell">
                    <span class="day-badge" [class.weekend-badge]="day.isWeekend || day.weekend">{{ day.dayOfWeek }}</span>
                    <span class="date-text font-mono">{{ day.date }}</span>
                  </div>
                </td>

                <!-- DYNAMIC TASK COLUMNS -->
                @for (task of state.activeMonthData()?.taskColumns; track task; let taskIndex = $index) {
                  <td class="col-task">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      class="cell-input pt-input font-mono"
                      [id]="'input-' + rowIndex + '-task-' + taskIndex"
                      [attr.data-row]="rowIndex"
                      [attr.data-col]="taskIndex + 1"
                      [ngModel]="getTaskPt(day, task)"
                      (ngModelChange)="setTaskPt(day, task, $event)"
                      (blur)="triggerUpdate()"
                      (keydown)="handleCellKeydown($event, rowIndex, taskIndex + 1)"
                      placeholder="0.0">
                  </td>
                }

                <!-- TOTAL PT PER DAY -->
                <td class="col-pt font-mono">
                  <span class="pt-badge" [class.positive]="day.totalPt && day.totalPt > 0">
                    {{ day.totalPt ? day.totalPt.toFixed(2) + ' PT' : '-' }}
                  </span>
                </td>

                <!-- INLINE EXPANDING DAILY NOTES -->
                <td class="col-notes">
                  <textarea
                    cdkTextareaAutosize
                    #autosize="cdkTextareaAutosize"
                    cdkAutosizeMinRows="1"
                    cdkAutosizeMaxRows="8"
                    class="notes-textarea"
                    [id]="'input-' + rowIndex + '-notes'"
                    [attr.data-row]="rowIndex"
                    [(ngModel)]="day.notes"
                    (blur)="triggerUpdate()"
                    (keydown)="handleNotesKeydown($event, day, rowIndex)"
                    placeholder="- Tagesaktivität erfassen..."></textarea>
                </td>

                <td class="col-actions">
                  <button
                    mat-icon-button
                    class="row-action-btn"
                    (click)="duplicateFromPrevious(rowIndex)"
                    [disabled]="rowIndex === 0"
                    matTooltip="Vortag kopieren (Ctrl+D)"
                    aria-label="Vortag kopieren">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    class="row-action-btn"
                    (click)="clearRow(rowIndex)"
                    matTooltip="Zeile leeren"
                    aria-label="Zeile leeren">
                    <mat-icon>clear</mat-icon>
                  </button>
                </td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td class="total-label">Summen:</td>
              @for (task of state.activeMonthData()?.taskColumns; track task) {
                <td class="col-task font-mono task-total-cell">
                  {{ formatPt(state.activeMonthData()?.taskTotals?.[task]) }}
                </td>
              }
              <td class="col-pt font-mono total-value">
                {{ formatPt(state.activeMonthData()?.totalPt) }} PT
              </td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .editor-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #ffffff;
      outline: none;
    }

    .metrics-bar {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 12px 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .metric-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .metric-label {
      font-size: 13px;
      color: #6c757d;
      font-weight: 500;
    }

    .metric-value {
      font-size: 18px;
      font-weight: 700;
      color: #d9480f;
    }

    .edit-tasks-btn {
      height: 36px;
      font-size: 12px;
    }

    .shortcut-hints {
      margin-left: auto;
      display: flex;
      gap: 12px;
    }

    .hint-tag {
      font-size: 11px;
      color: #868e96;
      display: flex;
      align-items: center;
      gap: 4px;

      kbd {
        background: #e9ecef;
        padding: 2px 5px;
        border-radius: 4px;
        border: 1px solid #ced4da;
        font-family: monospace;
        color: #495057;
      }
    }

    .table-scroll-wrapper {
      flex: 1;
      overflow-y: auto;
    }

    .timesheet-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;

      th {
        position: sticky;
        top: 0;
        background: #f1f3f5;
        padding: 8px 10px;
        font-weight: 600;
        color: #495057;
        border-bottom: 2px solid #dee2e6;
        z-index: 10;
        white-space: nowrap;
      }

      td {
        padding: 4px 6px;
        border-bottom: 1px solid #e9ecef;
        vertical-align: top;
      }

      tr:hover {
        background-color: #f8f9fa;
      }

      tr.weekend-row {
        background-color: #f1f3f5;
        color: #868e96;

        &:hover {
          background-color: #e9ecef;
        }

        .date-text {
          color: #868e96;
        }

        .pt-badge {
          color: #adb5bd;

          &.positive {
            color: #d9480f;
          }
        }
      }

      tr.has-hours {
        background-color: #fffaf6;
      }

      tr.weekend-row.has-hours {
        background-color: #fff4e6;
      }
    }

    .col-date { width: 110px; }
    .col-task {
      width: 100px;
      min-width: 90px;
      max-width: 140px;
      text-align: center;
    }
    .col-pt { width: 95px; text-align: right; }
    .col-notes { width: auto; min-width: 250px; }
    .col-actions { width: 70px; text-align: center; }

    .date-day-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      padding: 2px 0;
    }

    .date-text {
      font-size: 12px;
      color: #495057;
      line-height: 1.2;
    }

    .day-badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.3;
      background: #e9ecef;
      color: #495057;

      &.weekend-badge {
        background: #ffe3e3;
        color: #c92a2a;
        border: 1px solid #ffa8a8;
        font-weight: 700;
      }
    }

    .cell-input {
      width: 100%;
      height: 30px;
      padding: 4px 6px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      font-size: 13px;
      box-sizing: border-box;
      transition: border-color 0.15s, background-color 0.15s;

      &:hover {
        border-color: #ced4da;
        background: #ffffff;
      }

      &:focus {
        outline: none;
        border-color: #d9480f;
        background: #ffffff;
        box-shadow: 0 0 0 2px rgba(217, 72, 15, 0.2);
      }
    }

    .pt-input {
      text-align: center;
    }

    .pt-badge {
      font-weight: 600;
      color: #868e96;

      &.positive {
        color: #d9480f;
      }
    }

    .notes-textarea {
      width: 100%;
      min-height: 28px;
      padding: 5px 8px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      font-size: 13px;
      font-family: inherit;
      line-height: 1.4;
      resize: none;
      box-sizing: border-box;
      transition: border-color 0.15s, background-color 0.15s;

      &:hover {
        border-color: #ced4da;
        background: #ffffff;
      }

      &:focus {
        outline: none;
        border-color: #d9480f;
        background: #ffffff;
        box-shadow: 0 0 0 2px rgba(217, 72, 15, 0.2);
      }
    }

    .totals-row {
      background: #f8f9fa;
      font-weight: 700;
      border-top: 2px solid #dee2e6;

      .total-label {
        text-align: right;
        padding-right: 12px;
        color: #495057;
      }

      .task-total-cell {
        text-align: center;
        color: #495057;
        font-size: 13px;
      }

      .total-value {
        color: #d9480f;
        font-size: 15px;
      }
    }

    .row-action-btn {
      width: 28px;
      height: 28px;
      line-height: 28px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }
  `]
})
export class PersonDaysEditorComponent {
  readonly state = inject(TimesheetStateService);
  private readonly dialog = inject(MatDialog);

  formatPt(pt: number | undefined): string {
    return pt != null ? pt.toFixed(2) : '0.00';
  }

  isWeekend(day: TimesheetDay): boolean {
    return !!(day.isWeekend || day.weekend || day.dayOfWeek === 'Samstag' || day.dayOfWeek === 'Sonntag' || day.dayOfWeek === 'Saturday' || day.dayOfWeek === 'Sunday');
  }

  countLoggedDays(): number {
    const days = this.state.activeMonthData()?.days || [];
    return days.filter(d => !this.isWeekend(d) && ((d.totalPt != null && d.totalPt > 0) || (d.notes && d.notes.trim().length > 0))).length;
  }

  countTotalWorkDays(): number {
    const days = this.state.activeMonthData()?.days || [];
    return days.filter(d => !this.isWeekend(d)).length;
  }

  getTaskPt(day: TimesheetDay, task: string): number | null {
    if (!day.taskAllocations || day.taskAllocations[task] == null) {
      return null;
    }
    return day.taskAllocations[task];
  }

  setTaskPt(day: TimesheetDay, task: string, val: any) {
    if (!day.taskAllocations) {
      day.taskAllocations = {};
    }
    if (val === '' || val == null || isNaN(val)) {
      delete day.taskAllocations[task];
    } else {
      day.taskAllocations[task] = Number(val);
    }
    this.triggerUpdate();
  }

  triggerUpdate() {
    this.state.updateActiveMonthData(month => {
      // triggers recalculation and debounced auto-save
    });
  }

  duplicateFromPrevious(rowIndex: number) {
    if (rowIndex > 0) {
      this.state.duplicateDay(rowIndex - 1, rowIndex);
    }
  }

  clearRow(rowIndex: number) {
    this.state.updateActiveMonthData(month => {
      const day = month.days[rowIndex];
      day.taskAllocations = {};
      day.notes = null;
      day.totalPt = 0.0;
    });
  }

  openEditTasksDialog() {
    const current = this.state.activeMonthData();
    if (!current) return;

    const dialogRef = this.dialog.open(TaskColumnsDialogComponent, {
      data: {
        projectName: current.projectName,
        year: current.year,
        month: current.month,
        taskColumns: current.taskColumns
      }
    });

    dialogRef.afterClosed().subscribe((newTasks: string[] | undefined) => {
      if (newTasks && newTasks.length > 0) {
        this.state.updateActiveMonthData(month => {
          month.taskColumns = newTasks;
        });
      }
    });
  }

  handleGlobalKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      event.preventDefault();
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.hasAttribute('data-row')) {
        const row = parseInt(activeElement.getAttribute('data-row') || '0', 10);
        this.duplicateFromPrevious(row);
      }
    }
  }

  handleCellKeydown(event: KeyboardEvent, rowIndex: number, colIndex: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextRow = rowIndex + 1;
      const nextInput = document.querySelector(`[data-row="${nextRow}"][data-col="${colIndex}"]`) as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  handleNotesKeydown(event: KeyboardEvent, day: TimesheetDay, rowIndex: number) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      // Commit and jump to next row notes or next day
      const nextRow = rowIndex + 1;
      const nextNotes = document.getElementById(`input-${nextRow}-notes`);
      if (nextNotes) {
        nextNotes.focus();
      }
      return;
    }

    if (event.key === 'Enter') {
      // Smart bullet list support
      const textarea = event.target as HTMLTextAreaElement;
      const cursorPos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPos);
      const textAfter = textarea.value.substring(cursorPos);

      const currentLine = textBefore.split('\n').pop() || '';
      if (currentLine.trim().startsWith('- ') || currentLine.trim().startsWith('* ')) {
        const bullet = currentLine.trim().startsWith('- ') ? '- ' : '* ';
        if (currentLine.trim() === '-' || currentLine.trim() === '*') {
          // If empty bullet line, remove it on enter
          event.preventDefault();
          const lines = textBefore.split('\n');
          lines.pop();
          textarea.value = (lines.length > 0 ? lines.join('\n') + '\n' : '') + textAfter;
          day.notes = textarea.value;
          this.triggerUpdate();
        } else {
          event.preventDefault();
          const newText = textBefore + '\n' + bullet + textAfter;
          textarea.value = newText;
          day.notes = newText;
          textarea.selectionStart = textarea.selectionEnd = cursorPos + 1 + bullet.length;
          this.triggerUpdate();
        }
      }
    }
  }
}
