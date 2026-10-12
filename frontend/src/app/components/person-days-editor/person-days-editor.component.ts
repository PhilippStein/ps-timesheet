import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { CdkDragDrop, CdkDragStart, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { DayStatus, TimesheetDay } from '../../models/timesheet.model';
import { DateUtils } from '../../utils/date-utils';
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
    MatMenuModule,
    DragDropModule
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
      <div class="table-scroll-wrapper" cdkDropListGroup [class.is-dragging-active]="isDraggingNote">
        <table class="timesheet-table">
          <thead>
            <tr>
              <th class="col-date">Datum</th>
              <th class="col-status">Status</th>
              <th class="col-location">Ort</th>
              @for (task of state.activeMonthData()?.taskColumns; track task; let taskIndex = $index) {
                <th class="col-task font-mono" [matTooltip]="task">
                  <span class="task-header-text">{{ task }}</span>
                </th>
              }
              <th class="col-notes">Tätigkeit</th>
              <th class="col-actions">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            @for (day of state.activeMonthData()?.days; track day.date; let rowIndex = $index) {
              <tr [class.weekend-row]="day.isWeekend || day.weekend"
                  [class.vacation-row]="isVacation(day)"
                  [class.sick-row]="isSick(day)"
                  [class.holiday-row]="isHoliday(day)"
                  [class.has-hours]="day.totalPt && day.totalPt > 0"
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
                <td class="col-location">
                  <select
                    class="cell-select location-select"
                    [id]="'input-' + rowIndex + '-location'"
                    [attr.data-row]="rowIndex"
                    [attr.data-col]="2"
                    [ngModel]="day.location || ''"
                    (ngModelChange)="setLocation(day, $event)"
                    (keydown)="handleCellKeydown($event, rowIndex, 2)">
                    <option value="">-</option>
                    <option value="Remote">Remote</option>
                    <option value="Vor-Ort">Vor-Ort</option>
                    <option value="Urlaub">Urlaub</option>
                    <option value="Krank">Krank</option>
                    <option value="Feiertag">Feiertag</option>
                  </select>
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
                      [attr.data-col]="taskIndex + 3"
                      [ngModel]="getTaskPt(day, task)"
                      (ngModelChange)="setTaskPt(day, task, $event)"
                      (blur)="triggerUpdate()"
                      (keydown)="handleCellKeydown($event, rowIndex, taskIndex + 3)"
                      placeholder="0.0">
                  </td>
                }

                <!-- ADDITIVE DAILY NOTES CHIPS & TEMPLATES -->
                <td class="col-notes">
                  <div
                    class="notes-cell-container"
                    cdkDropList
                    cdkDropListOrientation="vertical"
                    [cdkDropListData]="{ day: day, list: getNotesList(day) }"
                    (cdkDropListDropped)="dropNote(day, $event)">
                    @if (getNotesList(day).length > 0) {
                      <div class="notes-chips-list">
                        @for (note of getNotesList(day); track $index; let noteIndex = $index) {
                          @if (isEditingNote(day, noteIndex)) {
                            <span class="note-chip note-chip-editing">
                              <input
                                type="text"
                                class="note-chip-edit-input"
                                [(ngModel)]="editingNote!.text"
                                (keydown)="handleEditNoteKeydown($event, day, noteIndex)"
                                (blur)="saveEditNote(day, noteIndex)"
                                (click)="$event.stopPropagation()"
                                autofocus
                                #editInput>
                            </span>
                          } @else {
                            <span
                              class="note-chip"
                              cdkDrag
                              (cdkDragStarted)="onDragStarted($event)"
                              (cdkDragEnded)="onDragEnded()"
                              (dblclick)="startEditNote(day, noteIndex, note, $event)"
                              [title]="'Doppelklick zum Bearbeiten: ' + note">
                              <!-- Custom Drag Preview with Finder-like Copy Badge -->
                              <span class="note-chip note-chip-preview" *cdkDragPreview [class.is-copy-mode]="isCopyModifierActive">
                                <mat-icon class="chip-drag-handle">drag_indicator</mat-icon>
                                <span class="note-chip-text">{{ note }}</span>
                                @if (isCopyModifierActive) {
                                  <span class="copy-badge" title="Kopieren">
                                    <mat-icon>add</mat-icon>
                                  </span>
                                }
                              </span>

                              <mat-icon cdkDragHandle class="chip-drag-handle" [title]="dragHandleTooltip">drag_indicator</mat-icon>
                              <span class="note-chip-text">{{ note }}</span>
                              <button
                                type="button"
                                class="note-chip-edit"
                                (click)="startEditNote(day, noteIndex, note, $event)"
                                title="Notiz bearbeiten"
                                aria-label="Notiz bearbeiten">
                                <mat-icon>edit</mat-icon>
                              </button>
                              <button
                                type="button"
                                class="note-chip-remove"
                                (click)="removeNote(day, noteIndex)"
                                title="Notiz entfernen"
                                aria-label="Notiz entfernen">
                                <mat-icon>close</mat-icon>
                              </button>
                            </span>
                          }
                        }
                      </div>
                    }

                    @if (getRecurringSuggestions(day).length > 0) {
                      <div class="notes-suggestions-row">
                        @for (suggestion of getRecurringSuggestions(day); track suggestion) {
                          <button
                            type="button"
                            class="note-suggestion-btn"
                            (click)="addNote(day, suggestion)"
                            [title]="'+ ' + suggestion + ' hinzufügen'">
                            <mat-icon>add</mat-icon> {{ suggestion }}
                          </button>
                        }
                      </div>
                    }

                    <div class="notes-input-wrapper">
                      <input
                        #noteInput
                        type="text"
                        class="notes-inline-input"
                        [id]="'input-' + rowIndex + '-notes'"
                        [attr.data-row]="rowIndex"
                        placeholder="+ Notiz (Enter)..."
                        (keydown)="handleNotesInputKeydown($event, day, rowIndex, noteInput)"
                        (blur)="handleNotesInputBlur(day, noteInput)">
                    </div>
                  </div>
                </td>

                <td class="col-actions">
                  <div class="action-buttons-cell">
                    <button
                      mat-icon-button
                      class="row-action-btn"
                      [matMenuTriggerFor]="notesMenu"
                      [disabled]="getAllAvailableTemplateSuggestions(day).length === 0"
                      matTooltip="Tätigkeit-Vorlagen"
                      aria-label="Tätigkeit-Vorlagen">
                      <mat-icon>playlist_add</mat-icon>
                    </button>
                    <mat-menu #notesMenu="matMenu" class="notes-templates-menu">
                      @for (templateNote of getAllAvailableTemplateSuggestions(day); track templateNote) {
                        <button mat-menu-item (click)="addNote(day, templateNote)">
                          <mat-icon>add_circle_outline</mat-icon>
                          <span>{{ templateNote }}</span>
                        </button>
                      }
                    </mat-menu>
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
              <td colspan="3" class="total-label">Summen:</td>
              @for (task of state.activeMonthData()?.taskColumns; track task) {
                <td class="col-task font-mono task-total-cell">
                  {{ formatPt(state.activeMonthData()?.taskTotals?.[task]) }}
                </td>
              }
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
        padding: 8px 10px;
        font-weight: 600;
        color: #495057;
        border-bottom: 2px solid #dee2e6;
        z-index: 10;
        white-space: nowrap;
      }

      tfoot {
        position: sticky;
        bottom: 0;
        z-index: 10;
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
      }

      tr.hidden-weekend {
        display: none !important;
      }

      tr.week-separator td {
        border-top: 2px solid #adb5bd;
      }

      tr.has-hours {
        background-color: #fffaf6;
      }

      tr.weekend-row.has-hours {
        background-color: #fff4e6;
      }
    }

    .col-date { width: 110px; }
    .col-status { width: 95px; }
    .col-location { width: 95px; }
    .col-task {
      width: 100px;
      min-width: 90px;
      max-width: 140px;
      text-align: center;
    }
    .col-notes { width: auto; min-width: 250px; }
    .col-actions { width: 96px; min-width: 96px; text-align: center; padding: 2px 4px !important; }

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
        border-color: #d9480f;
        background: #ffffff;
        box-shadow: 0 0 0 2px rgba(217, 72, 15, 0.2);
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

    .notes-cell-container {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      min-height: 28px;
      padding: 4px 0;
      width: 100%;
      border-radius: 4px;
      box-sizing: border-box;
      transition: background-color 0.15s, outline 0.15s;

      &.cdk-drop-list-receiving {
        background-color: rgba(51, 154, 240, 0.08);
        outline: 1px dashed #74c0fc;
      }
    }

    .table-scroll-wrapper.is-dragging-active tr:hover .notes-cell-container {
      outline: 1px dashed #ced4da;
      background-color: rgba(0, 0, 0, 0.015);

      &.cdk-drop-list-receiving {
        background-color: rgba(51, 154, 240, 0.08);
        outline: 1px dashed #74c0fc;
      }
    }

    .notes-chips-list {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      width: 100%;
      border-radius: 4px;
      box-sizing: border-box;
    }

    .cdk-drag-placeholder {
      opacity: 0.4;
      background: #e7f5ff;
      border: 1px dashed #339af0;
      border-radius: 4px;
      min-height: 20px;
      width: 100%;
      box-sizing: border-box;
    }

    .notes-suggestions-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .note-chip {
      display: inline-flex;
      align-items: center;
      background: #e7f5ff;
      color: #1971c2;
      border: 1px solid #a5d8ff;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.2;
      padding: 2px 6px;
      gap: 4px;
      max-width: 100%;
      user-select: none;
      transition: background-color 0.15s, border-color 0.15s;

      &.note-chip-editing {
        background: #ffffff;
        border-color: #339af0;
        padding: 1px 4px;
        box-shadow: 0 0 0 2px rgba(51, 154, 240, 0.2);
        width: 100%;
      }
    }

    .note-chip-edit-input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 12px;
      line-height: 1.2;
      color: #1971c2;
      font-weight: 500;
      padding: 1px 2px;
      width: 100%;
      min-width: 90px;
    }

    .chip-drag-handle {
      font-size: 13px;
      width: 13px;
      height: 13px;
      line-height: 13px;
      cursor: grab;
      color: #74c0fc;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: -2px;
      user-select: none;

      &:hover {
        color: #1971c2;
      }

      &:active {
        cursor: grabbing;
      }
    }

    .note-chip-text {
      white-space: normal;
      word-break: break-word;
      cursor: pointer;
    }

    .note-chip-edit,
    .note-chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;
      cursor: pointer;
      color: #74c0fc;
      border-radius: 50%;
      width: 14px;
      height: 14px;
      flex-shrink: 0;

      mat-icon {
        font-size: 11px;
        width: 11px;
        height: 11px;
        line-height: 11px;
      }

      &:hover {
        background: #d0ebff;
      }
    }

    .note-chip-edit:hover {
      color: #1971c2;
    }

    .note-chip-remove:hover {
      color: #e03131;
    }

    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      background: #ffffff;
      color: #1971c2;
      border: 1px solid #74c0fc;
      padding: 2px 6px;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      position: relative;

      &.is-copy-mode {
        border-color: #2b8a3e;
      }
    }

    .copy-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: -6px;
      right: -6px;
      width: 16px;
      height: 16px;
      background: #28c840;
      color: #ffffff;
      border: 1.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
      animation: badgePop 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: none;

      mat-icon {
        font-size: 11px;
        width: 11px;
        height: 11px;
        line-height: 11px;
        font-weight: 700;
      }
    }

    @keyframes badgePop {
      0% { transform: scale(0.4); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .cdk-drag-placeholder {
      opacity: 0.35;
      border: 1px dashed #339af0;
      border-radius: 4px;
      background: #e7f5ff;
    }

    .cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    .note-suggestion-btn {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: #f1f3f5;
      color: #495057;
      border: 1px dashed #ced4da;
      border-radius: 4px;
      font-size: 11px;
      padding: 2px 6px;
      cursor: pointer;
      transition: all 0.15s ease;

      mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
        line-height: 12px;
        color: #228be6;
      }

      &:hover {
        background: #e7f5ff;
        border-color: #74c0fc;
        color: #1971c2;
      }
    }

    .notes-input-wrapper {
      display: inline-flex;
      align-items: center;
      flex: 1;
      min-width: 120px;
      position: relative;
    }

    .notes-inline-input {
      width: 100%;
      border: 1px solid transparent;
      border-radius: 3px;
      background: transparent;
      font-size: 12px;
      padding: 2px 4px;
      outline: none;
      color: #212529;

      &::placeholder {
        color: #adb5bd;
        font-style: italic;
      }

      &:hover {
        border-color: #ced4da;
        background: #ffffff;
      }

      &:focus {
        border-color: #4dabf7;
        background: #ffffff;
        box-shadow: 0 0 0 1px #4dabf7;
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

      .task-total-cell {
        text-align: center;
        color: #495057;
        font-size: 13px;
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
export class PersonDaysEditorComponent {
  readonly state = inject(TimesheetStateService);
  private readonly dialog = inject(MatDialog);
  readonly DayStatus = DayStatus;

  editingNote: { dayDate: string; index: number; text: string } | null = null;
  isDraggingNote = false;
  isCopyModifierActive = false;

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent) {
    if (this.isDraggingNote) {
      this.updateCopyModifierState(event);
    }
  }

  @HostListener('window:keyup', ['$event'])
  onWindowKeyup(event: KeyboardEvent) {
    if (this.isDraggingNote) {
      this.updateCopyModifierState(event);
    }
  }

  @HostListener('window:pointermove', ['$event'])
  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent) {
    if (this.isDraggingNote) {
      this.updateCopyModifierState(event);
    }
  }

  updateCopyModifierState(event: KeyboardEvent | MouseEvent) {
    const isMac = typeof navigator !== 'undefined' && (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent));
    if (isMac) {
      this.isCopyModifierActive = !!event.altKey;
    } else {
      this.isCopyModifierActive = !!(event.ctrlKey || event.altKey);
    }
  }

  onDragStarted(event?: CdkDragStart) {
    this.isDraggingNote = true;
    if (event?.event && ('altKey' in event.event || 'ctrlKey' in event.event)) {
      this.updateCopyModifierState(event.event as MouseEvent);
    } else {
      this.isCopyModifierActive = false;
    }
  }

  onDragEnded() {
    this.isDraggingNote = false;
    this.isCopyModifierActive = false;
  }

  formatPt(pt: number | undefined): string {
    return pt != null ? pt.toFixed(2) : '0.00';
  }

  isWeekend(day: TimesheetDay): boolean {
    return !!(day.isWeekend || day.weekend || day.dayOfWeek === 'Samstag' || day.dayOfWeek === 'Sonntag' || day.dayOfWeek === 'Saturday' || day.dayOfWeek === 'Sunday');
  }

  isVacation(day: TimesheetDay): boolean {
    return day.status === DayStatus.URLAUB || day.status === 'Urlaub';
  }

  isSick(day: TimesheetDay): boolean {
    return day.status === DayStatus.KRANK || day.status === 'Krank' || day.location === 'Krank';
  }

  isHoliday(day: TimesheetDay): boolean {
    return day.status === DayStatus.FEIERTAG || day.status === 'Feiertag' || day.location === 'Feiertag';
  }

  isVacationOrSick(day: TimesheetDay): boolean {
    return this.isVacation(day) || this.isSick(day) || this.isHoliday(day);
  }

  countLoggedDays(): number {
    const days = this.state.activeMonthData()?.days || [];
    return days.filter(d => !this.isWeekend(d) && !this.isVacationOrSick(d) && ((d.totalPt != null && d.totalPt > 0) || (d.notes && d.notes.trim().length > 0) || (d.notesList && d.notesList.length > 0))).length;
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
    if (day.status === DayStatus.URLAUB || day.status === 'Urlaub') {
      day.location = 'Urlaub';
    } else if (day.status === DayStatus.KRANK || day.status === 'Krank') {
      day.location = 'Krank';
    } else if (day.status === DayStatus.FEIERTAG || day.status === 'Feiertag') {
      day.location = 'Feiertag';
    } else if (!day.status && (day.location === 'Urlaub' || day.location === 'Krank' || day.location === 'Feiertag')) {
      day.location = null;
    }
    this.triggerUpdate();
  }

  setLocation(day: TimesheetDay, value: string | null) {
    day.location = value ? value : null;
    this.triggerUpdate();
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

  getNotesList(day: TimesheetDay): string[] {
    if (day.notesList && Array.isArray(day.notesList)) {
      return day.notesList;
    }
    if (day.notes) {
      day.notesList = this.parseNotes(day.notes);
      return day.notesList;
    }
    day.notesList = [];
    return day.notesList;
  }

  parseNotes(notes: string | null | undefined): string[] {
    if (!notes) return [];
    return notes
      .split(/\r?\n/)
      .map(line => line.replace(/^[\-\*\u2022\+]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  formatNotes(notesList: string[]): string | null {
    if (!notesList || notesList.length === 0) return null;
    const formatted = notesList
      .map(n => n.trim())
      .filter(n => n.length > 0)
      .map(n => `- ${n}`)
      .join('\n');
    return formatted.length > 0 ? formatted : null;
  }

  addNote(day: TimesheetDay, text: string, inputEl?: HTMLInputElement) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    const list = [...this.getNotesList(day), trimmed];
    day.notesList = list;
    day.notes = this.formatNotes(list);
    if (inputEl) {
      inputEl.value = '';
    }
    this.triggerUpdate();
  }

  removeNote(day: TimesheetDay, index: number) {
    if (this.isEditingNote(day, index)) {
      this.cancelEditNote();
    }
    const list = [...this.getNotesList(day)];
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      day.notesList = list;
      day.notes = this.formatNotes(list);
      this.triggerUpdate();
    }
  }

  startEditNote(day: TimesheetDay, index: number, currentText: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.editingNote = {
      dayDate: day.date,
      index,
      text: currentText
    };
  }

  isEditingNote(day: TimesheetDay, index: number): boolean {
    return this.editingNote !== null &&
      this.editingNote.dayDate === day.date &&
      this.editingNote.index === index;
  }

  saveEditNote(day: TimesheetDay, index: number) {
    if (!this.editingNote || this.editingNote.dayDate !== day.date || this.editingNote.index !== index) {
      return;
    }
    const trimmed = this.editingNote.text.trim();
    const list = [...this.getNotesList(day)];
    if (!trimmed) {
      list.splice(index, 1);
    } else {
      list[index] = trimmed;
    }
    this.editingNote = null;
    day.notesList = list;
    day.notes = this.formatNotes(list);
    this.triggerUpdate();
  }

  cancelEditNote() {
    this.editingNote = null;
  }

  handleEditNoteKeydown(event: KeyboardEvent, day: TimesheetDay, index: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.saveEditNote(day, index);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancelEditNote();
    }
  }

  get dragHandleTooltip(): string {
    const isMac = typeof navigator !== 'undefined' && (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent));
    return isMac
      ? 'Verschieben (Ziehen) / Kopieren (⌥ Option + Ziehen)'
      : 'Verschieben (Ziehen) / Kopieren (Strg + Ziehen)';
  }

  isCopyAction(event: CdkDragDrop<any>): boolean {
    const mouseEvent = event.event as MouseEvent | PointerEvent | undefined;
    if (!mouseEvent) {
      return false;
    }
    const isMac = typeof navigator !== 'undefined' && (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent));
    if (isMac) {
      return !!mouseEvent.altKey;
    }
    return !!(mouseEvent.ctrlKey || mouseEvent.altKey);
  }

  dropNote(targetDay: TimesheetDay, event: CdkDragDrop<any>) {
    this.isDraggingNote = false;
    this.isCopyModifierActive = false;
    const isCopy = this.isCopyAction(event);

    if (!event.previousContainer || event.previousContainer === event.container) {
      // Reorder or duplicate within the same day
      if (isCopy) {
        const list = [...this.getNotesList(targetDay)];
        const noteToCopy = list[event.previousIndex];
        if (noteToCopy) {
          const insertIndex = event.currentIndex >= 0 && event.currentIndex <= list.length
            ? event.currentIndex
            : list.length;
          list.splice(insertIndex, 0, noteToCopy);
          targetDay.notesList = list;
          targetDay.notes = this.formatNotes(list);
          this.triggerUpdate();
        }
      } else {
        if (event.previousIndex === event.currentIndex) {
          return;
        }
        const list = [...this.getNotesList(targetDay)];
        moveItemInArray(list, event.previousIndex, event.currentIndex);
        targetDay.notesList = list;
        targetDay.notes = this.formatNotes(list);
        this.triggerUpdate();
      }
    } else {
      // Cross-day drag & drop
      const sourceDay: TimesheetDay | null = event.previousContainer.data?.day || null;
      const sourceList: string[] | null = event.previousContainer.data?.list ||
        (sourceDay ? this.getNotesList(sourceDay) : null);
      const noteToTransfer = sourceList ? sourceList[event.previousIndex] : null;

      if (noteToTransfer) {
        if (!isCopy && sourceDay && sourceList) {
          // Default: Move note (remove from source day)
          sourceList.splice(event.previousIndex, 1);
          sourceDay.notesList = sourceList;
          sourceDay.notes = this.formatNotes(sourceList);
        }

        const targetList = [...this.getNotesList(targetDay)];
        const insertIndex = event.currentIndex >= 0 && event.currentIndex <= targetList.length
          ? event.currentIndex
          : targetList.length;
        targetList.splice(insertIndex, 0, noteToTransfer);
        targetDay.notesList = targetList;
        targetDay.notes = this.formatNotes(targetList);
        this.triggerUpdate();
      }
    }
  }

  getRecurringSuggestions(day: TimesheetDay): string[] {
    const project = this.state.selectedProject();
    if (!project?.recurringNotes) return [];
    const currentNotes = this.getNotesList(day);
    const dayName = (day.dayOfWeek || '').toLowerCase();
    return project.recurringNotes
      .filter(r => r.text && r.days && r.days.some(d => d.toLowerCase() === dayName))
      .map(r => r.text.trim())
      .filter(text => text.length > 0 && !currentNotes.includes(text));
  }

  getAllAvailableTemplateSuggestions(day: TimesheetDay): string[] {
    const project = this.state.selectedProject();
    if (!project) return [];
    const currentNotes = this.getNotesList(day);
    const result: string[] = [];

    if (project.defaultNotes) {
      for (const n of project.defaultNotes) {
        const trimmed = n.trim();
        if (trimmed && !currentNotes.includes(trimmed) && !result.includes(trimmed)) {
          result.push(trimmed);
        }
      }
    }

    if (project.recurringNotes) {
      for (const r of project.recurringNotes) {
        const trimmed = r.text?.trim();
        if (trimmed && !currentNotes.includes(trimmed) && !result.includes(trimmed)) {
          result.push(trimmed);
        }
      }
    }

    return result;
  }

  handleNotesInputKeydown(event: KeyboardEvent, day: TimesheetDay, rowIndex: number, inputEl: HTMLInputElement) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const val = inputEl.value.trim();
      if (val) {
        this.addNote(day, val, inputEl);
      } else {
        const nextRow = this.getNextVisibleRowIndex(rowIndex);
        if (nextRow >= 0) {
          const nextInput = document.getElementById(`input-${nextRow}-notes`) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
          }
        }
      }
    } else if (event.key === 'Tab' && !event.shiftKey) {
      const val = inputEl.value.trim();
      if (val) {
        this.addNote(day, val, inputEl);
      }
    }
  }

  handleNotesInputBlur(day: TimesheetDay, inputEl: HTMLInputElement) {
    const val = inputEl.value.trim();
    if (val) {
      this.addNote(day, val, inputEl);
    }
  }

  isRowHidden(day: TimesheetDay): boolean {
    if (!this.state.hideEmptyWeekends()) {
      return false;
    }
    const isWeekend = day.isWeekend || day.weekend;
    if (!isWeekend) {
      return false;
    }
    const hasPt = day.totalPt != null && day.totalPt > 0;
    const hasAllocations = day.taskAllocations && Object.values(day.taskAllocations).some(v => v != null && !isNaN(v) && v > 0);
    const hasNotes = (day.notes && day.notes.trim().length > 0) || (day.notesList && day.notesList.length > 0);
    const hasStatus = !!day.status && String(day.status).trim().length > 0;
    const hasLocation = !!day.location && String(day.location).trim().length > 0;
    return !hasPt && !hasAllocations && !hasNotes && !hasStatus && !hasLocation;
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
      day.location = this.isWeekend(day) ? null : 'Remote';
      day.taskAllocations = {};
      day.notes = null;
      day.notesList = [];
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
