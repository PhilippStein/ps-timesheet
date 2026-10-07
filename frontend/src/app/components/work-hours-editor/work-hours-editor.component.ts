import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetDay } from '../../models/timesheet.model';

@Component({
  selector: 'app-work-hours-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="editor-container" (keydown)="handleGlobalKeydown($event)">
      <!-- HEADER METRICS BAR -->
      <div class="metrics-bar">
        <div class="metric-item">
          <span class="metric-label">Monats-Gesamtzeit:</span>
          <span class="metric-value font-mono">{{ formatHours(state.activeMonthData()?.totalNetHours) }} h</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Erfasste Arbeitstage:</span>
          <span class="metric-value font-mono">{{ countWorkedDays() }} / {{ countTotalWorkDays() }}</span>
        </div>
        <div class="shortcut-hints">
          <span class="hint-tag"><kbd>Ctrl+D</kbd> Vortag kopieren</span>
          <span class="hint-tag"><kbd>Tab</kbd> Nächste Spalte</span>
          <span class="hint-tag"><kbd>Enter</kbd> Nächster Tag</span>
        </div>
      </div>

      <!-- TIMESHEET TABLE -->
      <div class="table-scroll-wrapper">
        <table class="timesheet-table">
          <thead>
            <tr>
              <th class="col-date">Datum</th>
              <th class="col-time">Beginn</th>
              <th class="col-time">Ende</th>
              <th class="col-pause">Pause (min)</th>
              <th class="col-net">Netto (h)</th>
              <th class="col-comment">Kommentar / Tätigkeiten</th>
              <th class="col-actions">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            @for (day of state.activeMonthData()?.days; track day.date; let rowIndex = $index) {
              <tr [class.weekend-row]="day.isWeekend || day.weekend" [class.has-hours]="day.netHours && day.netHours > 0">
                <td class="col-date">
                  <div class="date-day-cell">
                    <span class="day-badge" [class.weekend-badge]="day.isWeekend || day.weekend">{{ day.dayOfWeek }}</span>
                    <span class="date-text font-mono">{{ day.date }}</span>
                  </div>
                </td>
                <td class="col-time">
                  <input
                    type="text"
                    class="cell-input time-input font-mono"
                    [id]="'input-' + rowIndex + '-start'"
                    [attr.data-row]="rowIndex"
                    [attr.data-col]="1"
                    [(ngModel)]="day.startTime"
                    (blur)="onTimeBlur(day, 'start'); triggerUpdate()"
                    (keydown)="handleCellKeydown($event, rowIndex, 1)"
                    placeholder="08:30"
                    maxlength="5">
                </td>
                <td class="col-time">
                  <input
                    type="text"
                    class="cell-input time-input font-mono"
                    [id]="'input-' + rowIndex + '-end'"
                    [attr.data-row]="rowIndex"
                    [attr.data-col]="2"
                    [(ngModel)]="day.endTime"
                    (blur)="onTimeBlur(day, 'end'); triggerUpdate()"
                    (keydown)="handleCellKeydown($event, rowIndex, 2)"
                    placeholder="17:00"
                    maxlength="5">
                </td>
                <td class="col-pause">
                  <input
                    type="number"
                    class="cell-input pause-input font-mono"
                    [id]="'input-' + rowIndex + '-pause'"
                    [attr.data-row]="rowIndex"
                    [attr.data-col]="3"
                    [(ngModel)]="day.pauseMinutes"
                    (blur)="triggerUpdate()"
                    (keydown)="handleCellKeydown($event, rowIndex, 3)"
                    placeholder="30"
                    min="0"
                    step="5">
                </td>
                <td class="col-net font-mono">
                  <span class="net-hours-badge" [class.positive]="day.netHours && day.netHours > 0">
                    {{ day.netHours ? day.netHours.toFixed(2) + ' h' : '-' }}
                  </span>
                </td>
                <td class="col-comment">
                  <input
                    type="text"
                    class="cell-input comment-input"
                    [id]="'input-' + rowIndex + '-comment'"
                    [attr.data-row]="rowIndex"
                    [attr.data-col]="4"
                    [(ngModel)]="day.comment"
                    (blur)="triggerUpdate()"
                    (keydown)="handleCellKeydown($event, rowIndex, 4)"
                    placeholder="Tätigkeit eintragen...">
                </td>
                <td class="col-actions">
                  <div class="action-buttons-cell">
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
                  </div>
                </td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="4" class="total-label">Monats-Gesamtstunden:</td>
              <td class="col-net font-mono total-value">
                {{ formatHours(state.activeMonthData()?.totalNetHours) }} h
              </td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
      overflow: hidden;
    }

    .editor-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
      background: #ffffff;
      outline: none;
      overflow: hidden;
    }

    .metrics-bar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 24px;
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
      color: #0ca678;
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
      min-height: 0;
      overflow-y: auto;
      overflow-x: auto;
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
        padding: 8px 12px;
        font-weight: 600;
        color: #495057;
        border-bottom: 2px solid #dee2e6;
        z-index: 10;
      }

      tfoot {
        position: sticky;
        bottom: 0;
        z-index: 10;
      }

      td {
        padding: 4px 8px;
        border-bottom: 1px solid #e9ecef;
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

        .net-hours-badge {
          color: #adb5bd;

          &.positive {
            color: #0ca678;
          }
        }
      }

      tr.has-hours {
        background-color: #f8fffb;
      }

      tr.weekend-row.has-hours {
        background-color: #e6fcf5;
      }
    }

    .col-date { width: 110px; }
    .col-time { width: 90px; }
    .col-pause { width: 90px; }
    .col-net { width: 95px; text-align: right; }
    .col-comment { width: auto; }
    .col-actions { width: 76px; min-width: 76px; text-align: center; padding: 2px 4px !important; }

    .action-buttons-cell {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }

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
      padding: 4px 8px;
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
        border-color: #339af0;
        background: #ffffff;
        box-shadow: 0 0 0 2px rgba(51, 154, 240, 0.2);
      }
    }

    .time-input, .pause-input {
      text-align: center;
    }

    .net-hours-badge {
      font-weight: 600;
      color: #868e96;

      &.positive {
        color: #0ca678;
      }
    }

    .totals-row {
      background: #f1f3f5;
      font-weight: 700;
      border-top: 2px solid #dee2e6;
      box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);

      td {
        background: #f1f3f5;
      }

      .total-label {
        text-align: right;
        padding-right: 12px;
        color: #495057;
      }

      .total-value {
        color: #0ca678;
        font-size: 15px;
      }
    }

    .row-action-btn {
      &.mat-mdc-icon-button {
        --mdc-icon-button-state-layer-size: 26px;
        --mdc-icon-button-icon-size: 16px;
        width: 26px !important;
        height: 26px !important;
        min-width: 26px !important;
        min-height: 26px !important;
        padding: 0 !important;
        line-height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      ::ng-deep .mat-mdc-button-touch-target,
      .mat-mdc-button-touch-target {
        display: none !important;
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        line-height: 16px;
      }

      &:disabled,
      &[disabled] {
        opacity: 0.25 !important;
        cursor: not-allowed !important;
        pointer-events: none !important;
        color: #ced4da !important;

        mat-icon {
          color: #ced4da !important;
        }
      }
    }
  `]
})
export class WorkHoursEditorComponent {
  readonly state = inject(TimesheetStateService);

  formatHours(hours: number | undefined): string {
    return hours != null ? hours.toFixed(2) : '0.00';
  }

  isWeekend(day: TimesheetDay): boolean {
    return !!(day.isWeekend || day.weekend || day.dayOfWeek === 'Samstag' || day.dayOfWeek === 'Sonntag' || day.dayOfWeek === 'Saturday' || day.dayOfWeek === 'Sunday');
  }

  countWorkedDays(): number {
    const days = this.state.activeMonthData()?.days || [];
    return days.filter(d => !this.isWeekend(d) && d.netHours != null && d.netHours > 0).length;
  }

  countTotalWorkDays(): number {
    const days = this.state.activeMonthData()?.days || [];
    return days.filter(d => !this.isWeekend(d)).length;
  }

  triggerUpdate() {
    this.state.updateActiveMonthData(month => {
      // triggers recalculation and debounced auto-save
    });
  }

  onTimeBlur(day: TimesheetDay, field: 'start' | 'end') {
    const val = field === 'start' ? day.startTime : day.endTime;
    if (!val || val.trim().length === 0) return;

    const formatted = this.smartFormatTime(val.trim());
    if (field === 'start') {
      day.startTime = formatted;
    } else {
      day.endTime = formatted;
    }
  }

  smartFormatTime(val: string): string {
    if (/^\d{1,2}:\d{2}$/.test(val)) {
      const [h, m] = val.split(':');
      return `${h.padStart(2, '0')}:${m}`;
    }
    if (/^\d{1,2}$/.test(val)) {
      return `${val.padStart(2, '0')}:00`;
    }
    if (/^\d{3}$/.test(val)) {
      return `0${val.charAt(0)}:${val.slice(1)}`;
    }
    if (/^\d{4}$/.test(val)) {
      return `${val.slice(0, 2)}:${val.slice(2)}`;
    }
    if (/^\d+(\.\d+)?$/.test(val)) {
      const num = parseFloat(val);
      const h = Math.floor(num);
      const m = Math.round((num - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return val;
  }

  duplicateFromPrevious(rowIndex: number) {
    if (rowIndex > 0) {
      this.state.duplicateDay(rowIndex - 1, rowIndex);
    }
  }

  clearRow(rowIndex: number) {
    this.state.updateActiveMonthData(month => {
      const day = month.days[rowIndex];
      day.startTime = null;
      day.endTime = null;
      day.pauseMinutes = null;
      day.comment = null;
      day.netHours = null;
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
      // Move down to the same column on the next row
      const nextRow = rowIndex + 1;
      const nextInput = document.querySelector(`[data-row="${nextRow}"][data-col="${colIndex}"]`) as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }
}
