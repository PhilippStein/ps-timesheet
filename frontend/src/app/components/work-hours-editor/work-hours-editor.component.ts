import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { DayStatus, TimesheetDay } from '../../models/timesheet.model';
import { DateUtils } from '../../utils/date-utils';

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
    MatTooltipModule,
    MatMenuModule
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
        <div class="header-actions">
          <button
            mat-icon-button
            class="info-shortcuts-btn"
            [matMenuTriggerFor]="shortcutsMenu"
            matTooltip="Tastaturkürzel & Bedienhinweise"
            aria-label="Tastaturkürzel & Bedienhinweise">
            <mat-icon>info_outline</mat-icon>
          </button>

          <mat-menu #shortcutsMenu="matMenu" class="shortcuts-menu-panel" xPosition="before">
            <div class="shortcuts-panel-content" (click)="$event.stopPropagation()">
              <div class="shortcuts-section-title">
                <mat-icon>keyboard</mat-icon>
                <span>Tastaturnavigation & Shortcuts</span>
              </div>
              <div class="shortcuts-list">
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>Tab</kbd> / <kbd>Shift+Tab</kbd></span>
                  <span class="shortcut-desc">Nächste / vorherige Spalte wechseln</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>Enter</kbd></span>
                  <span class="shortcut-desc">Nächster Tag (gleiche Spalte)</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>{{ isMac ? '⌘+D' : 'Ctrl+D' }}</kbd></span>
                  <span class="shortcut-desc">Vortag kopieren (Beginn, Ende, Pause)</span>
                </div>
              </div>

              <div class="shortcuts-divider"></div>

              <div class="shortcuts-section-title">
                <mat-icon>schedule</mat-icon>
                <span>Schnelle Zeiteingabe</span>
              </div>
              <div class="shortcuts-list">
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>8</kbd> / <kbd>830</kbd> / <kbd>8.5</kbd></span>
                  <span class="shortcut-desc">Wird automatisch zu <code>08:00</code> / <code>08:30</code> formatiert</span>
                </div>
              </div>
            </div>
          </mat-menu>
        </div>
      </div>

      <!-- TIMESHEET TABLE -->
      <div class="table-scroll-wrapper">
        <table class="timesheet-table">
          <thead>
            <tr>
              <th class="col-date">Datum</th>
              <th class="col-status">Status</th>
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
              <tr [class.weekend-row]="day.isWeekend || day.weekend"
                  [class.vacation-row]="isVacation(day)"
                  [class.sick-row]="isSick(day)"
                  [class.holiday-row]="isHoliday(day)"
                  [class.has-hours]="day.netHours && day.netHours > 0"
                  [class.hidden-weekend]="isRowHidden(day)"
                  [class.week-separator]="isWeekSeparator(rowIndex)">
                <td class="col-date">
                  <div class="date-day-cell">
                    <span class="day-badge" [class.weekend-badge]="day.isWeekend || day.weekend">{{ day.dayOfWeek }}</span>
                    <span class="date-text font-mono">{{ day.date }}</span>
                  </div>
                </td>
                <td class="col-status">
                  <select
                    class="cell-select status-select"
                    [class.status-vacation]="isVacation(day)"
                    [class.status-sick]="isSick(day)"
                    [class.status-holiday]="isHoliday(day)"
                    [id]="'input-' + rowIndex + '-status'"
                    [attr.data-row]="rowIndex"
                    [attr.data-col]="1"
                    [ngModel]="day.status || ''"
                    (ngModelChange)="setStatus(day, $event)"
                    (keydown)="handleCellKeydown($event, rowIndex, 1)">
                    <option value="">Regulär</option>
                    <option [value]="DayStatus.URLAUB">Urlaub</option>
                    <option [value]="DayStatus.KRANK">Krank</option>
                    <option [value]="DayStatus.FEIERTAG">Feiertag</option>
                  </select>
                </td>
                <td class="col-time">
                  <input
                    type="text"
                    class="cell-input time-input font-mono"
                    [id]="'input-' + rowIndex + '-start'"
                    [attr.data-row]="rowIndex"
                    [attr.data-col]="2"
                    [(ngModel)]="day.startTime"
                    (blur)="onTimeBlur(day, 'start'); triggerUpdate()"
                    (keydown)="handleCellKeydown($event, rowIndex, 2)"
                    placeholder="08:30"
                    maxlength="5">
                </td>
                <td class="col-time">
                  <input
                    type="text"
                    class="cell-input time-input font-mono"
                    [id]="'input-' + rowIndex + '-end'"
                    [attr.data-row]="rowIndex"
                    [attr.data-col]="3"
                    [(ngModel)]="day.endTime"
                    (blur)="onTimeBlur(day, 'end'); triggerUpdate()"
                    (keydown)="handleCellKeydown($event, rowIndex, 3)"
                    placeholder="17:00"
                    maxlength="5">
                </td>
                <td class="col-pause">
                  <input
                    type="number"
                    class="cell-input pause-input font-mono"
                    [id]="'input-' + rowIndex + '-pause'"
                    [attr.data-row]="rowIndex"
                    [attr.data-col]="4"
                    [(ngModel)]="day.pauseMinutes"
                    (blur)="triggerUpdate()"
                    (keydown)="handleCellKeydown($event, rowIndex, 4)"
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
                    [attr.data-col]="5"
                    [(ngModel)]="day.comment"
                    (blur)="triggerUpdate()"
                    (keydown)="handleCellKeydown($event, rowIndex, 5)"
                    placeholder="Tätigkeit eintragen...">
                </td>
                <td class="col-actions">
                  <div class="action-buttons-cell">
                    <button
                      mat-icon-button
                      class="row-action-btn"
                      (click)="duplicateFromPrevious(rowIndex)"
                      [disabled]="getPreviousVisibleRowIndex(rowIndex) < 0"
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
              <td colspan="5" class="total-label">Monats-Gesamtstunden:</td>
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

    .header-actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-shortcuts-btn {
      color: #868e96;
      transition: color 0.15s, background-color 0.15s;

      &:hover {
        color: #0ca678;
        background-color: rgba(12, 166, 120, 0.08);
      }
    }

    ::ng-deep .shortcuts-menu-panel {
      max-width: 440px !important;
      padding: 0 !important;
      border-radius: 8px !important;
    }

    .shortcuts-panel-content {
      padding: 14px 16px;
      min-width: 330px;
      max-width: 420px;
      font-size: 13px;
      color: #343a40;
      line-height: 1.4;
      cursor: default;
      user-select: text;
    }

    .shortcuts-section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #495057;
      margin-bottom: 8px;

      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
        color: #0ca678;
      }
    }

    .shortcuts-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .shortcut-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .shortcut-keys {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #495057;

      kbd {
        background: #f1f3f5;
        padding: 2px 5px;
        border-radius: 4px;
        border: 1px solid #ced4da;
        box-shadow: 0 1px 1px rgba(0, 0, 0, 0.08);
        font-family: monospace;
        font-size: 11px;
        color: #212529;
      }
    }

    .shortcut-desc {
      font-size: 12px;
      color: #495057;
      text-align: right;

      code {
        background: #e9ecef;
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 11px;
        font-family: monospace;
      }
    }

    .shortcuts-divider {
      height: 1px;
      background: #dee2e6;
      margin: 12px 0 10px 0;
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

      tr.hidden-weekend {
        display: none !important;
      }

      tr.week-separator td {
        border-top: 2px solid #adb5bd;
      }

      tr.has-hours {
        background-color: #f8fffb;
      }

      tr.weekend-row.has-hours {
        background-color: #e6fcf5;
      }
    }

    .col-date { width: 110px; }
    .col-status { width: 95px; }
    .col-time { width: 90px; }
    .col-pause { width: 90px; }
    .col-net { width: 95px; text-align: right; }
    .col-comment { width: auto; }
    .col-actions { width: 76px; min-width: 76px; text-align: center; padding: 2px 4px !important; }

    .cell-select {
      width: 100%;
      height: 30px;
      padding: 2px 6px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      font-size: 12px;
      font-weight: 500;
      color: #495057;
      box-sizing: border-box;
      cursor: pointer;
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

      &.status-vacation {
        background-color: #e0f2fe;
        color: #0369a1;
        font-weight: 600;
        border-color: #bae6fd;
      }

      &.status-sick {
        background-color: #fee2e2;
        color: #b91c1c;
        font-weight: 600;
        border-color: #fecaca;
      }

      &.status-holiday {
        background-color: #f3e8ff;
        color: #7e22ce;
        font-weight: 600;
        border-color: #e9d5ff;
      }
    }

    tr.vacation-row {
      background-color: #f0f9ff;
      &:hover {
        background-color: #e0f2fe;
      }
    }

    tr.sick-row {
      background-color: #fff1f2;
      &:hover {
        background-color: #fee2e2;
      }
    }

    tr.holiday-row {
      background-color: #faf5ff;
      &:hover {
        background-color: #f3e8ff;
      }
    }

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
  readonly DayStatus = DayStatus;
  readonly isMac = typeof navigator !== 'undefined' && (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent));

  formatHours(hours: number | undefined): string {
    return hours != null ? hours.toFixed(2) : '0.00';
  }

  isWeekend(day: TimesheetDay): boolean {
    return !!(day.isWeekend || day.weekend || day.dayOfWeek === 'Samstag' || day.dayOfWeek === 'Sonntag' || day.dayOfWeek === 'Saturday' || day.dayOfWeek === 'Sunday');
  }

  isVacation(day: TimesheetDay): boolean {
    return day.status === DayStatus.URLAUB || day.status === 'Urlaub';
  }

  isSick(day: TimesheetDay): boolean {
    return day.status === DayStatus.KRANK || day.status === 'Krank';
  }

  isHoliday(day: TimesheetDay): boolean {
    return day.status === DayStatus.FEIERTAG || day.status === 'Feiertag';
  }

  isVacationOrSick(day: TimesheetDay): boolean {
    return this.isVacation(day) || this.isSick(day) || this.isHoliday(day);
  }

  countWorkedDays(): number {
    const days = this.state.activeMonthData()?.days || [];
    return days.filter(d => !this.isWeekend(d) && !this.isVacationOrSick(d) && d.netHours != null && d.netHours > 0).length;
  }

  countTotalWorkDays(): number {
    const active = this.state.activeMonthData();
    if (active?.workingDays != null) {
      return active.workingDays;
    }
    const days = active?.days || [];
    return days.filter(d => !this.isWeekend(d) && !this.isVacationOrSick(d)).length;
  }

  setStatus(day: TimesheetDay, value: string | DayStatus | null) {
    day.status = value ? (value as DayStatus) : null;
    this.triggerUpdate();
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

  isRowHidden(day: TimesheetDay): boolean {
    if (!this.state.hideEmptyWeekends()) {
      return false;
    }
    const isWeekend = day.isWeekend || day.weekend;
    if (!isWeekend) {
      return false;
    }
    const hasStartTime = day.startTime && day.startTime.trim().length > 0;
    const hasEndTime = day.endTime && day.endTime.trim().length > 0;
    const hasPause = day.pauseMinutes != null && day.pauseMinutes > 0;
    const hasComment = day.comment && day.comment.trim().length > 0;
    const hasNetHours = day.netHours != null && day.netHours > 0;
    const hasStatus = !!day.status && String(day.status).trim().length > 0;
    return !hasStartTime && !hasEndTime && !hasPause && !hasComment && !hasNetHours && !hasStatus;
  }

  isWeekSeparator(rowIndex: number): boolean {
    if (!this.state.hideEmptyWeekends()) {
      return false;
    }
    const days = this.state.activeMonthData()?.days;
    if (!days || rowIndex <= 0) {
      return false;
    }
    const currentDay = days[rowIndex];
    if (this.isRowHidden(currentDay)) {
      return false;
    }
    const prevIndex = this.getPreviousVisibleRowIndex(rowIndex);
    if (prevIndex < 0) {
      return false;
    }
    const prevDay = days[prevIndex];
    return DateUtils.isDifferentWeek(prevDay.date, currentDay.date);
  }

  getPreviousVisibleRowIndex(currentIndex: number): number {
    const days = this.state.activeMonthData()?.days;
    if (!days) return currentIndex - 1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!this.isRowHidden(days[i])) {
        return i;
      }
    }
    return -1;
  }

  getNextVisibleRowIndex(currentIndex: number): number {
    const days = this.state.activeMonthData()?.days;
    if (!days) return currentIndex + 1;
    for (let i = currentIndex + 1; i < days.length; i++) {
      if (!this.isRowHidden(days[i])) {
        return i;
      }
    }
    return -1;
  }

  duplicateFromPrevious(rowIndex: number) {
    const prevIndex = this.getPreviousVisibleRowIndex(rowIndex);
    if (prevIndex >= 0) {
      this.state.duplicateDay(prevIndex, rowIndex);
    }
  }

  clearRow(rowIndex: number) {
    this.state.updateActiveMonthData(month => {
      const day = month.days[rowIndex];
      day.status = null;
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
      // Move down to the same column on the next visible row
      const nextRow = this.getNextVisibleRowIndex(rowIndex);
      if (nextRow >= 0) {
        const nextInput = document.querySelector(`[data-row="${nextRow}"][data-col="${colIndex}"]`) as HTMLElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  }
}
