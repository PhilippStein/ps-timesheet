import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { TimesheetApiService } from '../../services/timesheet-api.service';
import { ProjectConfig, MonthNodeDTO, YearNodeDTO } from '../../models/project.model';
import { ProjectDialogComponent } from '../project-dialog/project-dialog.component';

@Component({
  selector: 'app-timesheet-navigation',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule
  ],
  template: `
    <nav class="onenote-nav-container" [class.collapsed]="state.isNavCollapsed()">
      @if (!state.isNavCollapsed()) {
        <!-- COLUMN 1: PROJECTS -->
        <section class="nav-column projects-column">
          <header class="column-header">
            <span class="column-title">PROJEKTE</span>
            <button mat-icon-button color="primary" (click)="openAddProjectDialog()" matTooltip="Neues Projekt (+ Projekt)" aria-label="Projekt hinzufügen">
              <mat-icon>add</mat-icon>
            </button>
          </header>

          <div class="column-list">
            @for (project of state.projects(); track project.name) {
              <div
                class="nav-item project-item"
                [class.active]="state.selectedProject()?.name === project.name"
                (click)="selectProject(project)">
                <div class="item-content">
                  <span class="item-title">{{ project.name }}</span>
                  <span class="item-badge" [class.badge-hours]="project.template === 'WorkHours'" [class.badge-days]="project.template === 'PersonDays'">
                    {{ project.template }}
                  </span>
                </div>
                <button
                  mat-icon-button
                  class="item-action-btn"
                  (click)="openEditProjectDialog(project, $event)"
                  matTooltip="Einstellungen"
                  aria-label="Einstellungen">
                  <mat-icon>settings</mat-icon>
                </button>
              </div>
            } @empty {
              <div class="empty-hint">Keine Projekte konfiguriert.</div>
            }
          </div>

          <footer class="column-footer">
            <button
              mat-icon-button
              class="collapse-toggle-btn"
              (click)="state.toggleNavCollapsed()"
              matTooltip="Seitenleiste einklappen"
              aria-label="Seitenleiste einklappen">
              <mat-icon>first_page</mat-icon>
            </button>
          </footer>
        </section>

        <!-- COLUMN 2: YEARS -->
        <section class="nav-column years-column">
          <header class="column-header">
            <span class="column-title">JAHRE</span>
            <button mat-icon-button color="primary" (click)="addNewYear()" matTooltip="Jahr hinzufügen (+ Jahr)" aria-label="Jahr hinzufügen">
              <mat-icon>add</mat-icon>
            </button>
          </header>

          <div class="column-list">
            @for (yearNode of state.availableYears(); track yearNode.year) {
              <div
                class="nav-item year-item"
                [class.active]="state.selectedYear() === yearNode.year"
                (click)="selectYear(yearNode.year)">
                <div class="item-content">
                  <span class="item-title">{{ yearNode.year }}</span>
                  <span class="count-badge">
                    {{ countExistingMonths(yearNode) }} / 12
                  </span>
                </div>
              </div>
            } @empty {
              <div class="empty-hint">-</div>
            }
          </div>

          <footer class="column-footer"></footer>
        </section>

        <!-- COLUMN 3: MONTHS -->
        <section class="nav-column months-column">
          <header class="column-header">
            <span class="column-title">MONATE</span>
            <button mat-icon-button color="primary" (click)="goToCurrentMonth()" matTooltip="Aktueller Monat (+ Monat)" aria-label="Aktueller Monat">
              <mat-icon>today</mat-icon>
            </button>
          </header>

          <div class="column-list">
            @for (monthNode of state.availableMonths(); track monthNode.month) {
              <div
                class="nav-item month-item"
                [class.active]="state.selectedMonth() === monthNode.month"
                (click)="selectMonth(monthNode.month)">
                <div class="item-content">
                  <span class="item-title">{{ formatMonthNumber(monthNode.month) }} - {{ monthNode.monthName }}</span>
                  @if (monthNode.exists) {
                    <mat-icon class="status-icon exists-icon" matTooltip="CSV existiert">check_circle</mat-icon>
                  } @else {
                    <mat-icon class="status-icon empty-icon" matTooltip="Wird bei Klick initialisiert">radio_button_unchecked</mat-icon>
                  }
                </div>
              </div>
            } @empty {
              <div class="empty-hint">-</div>
            }
          </div>

          <footer class="column-footer"></footer>
        </section>
      } @else {
        <!-- COLLAPSED STRIP -->
        <div class="collapsed-strip">
          <div class="strip-spacer"></div>
          <button
            mat-icon-button
            class="collapse-toggle-btn"
            (click)="state.toggleNavCollapsed()"
            matTooltip="Seitenleiste ausklappen"
            aria-label="Seitenleiste ausklappen">
            <mat-icon>last_page</mat-icon>
          </button>
        </div>
      }
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .onenote-nav-container {
      display: flex;
      height: 100%;
      background: #f1f3f5;
      border-right: 1px solid #dee2e6;
      user-select: none;
      transition: width 0.2s ease;

      &.collapsed {
        width: 44px;
        min-width: 44px;
      }
    }

    .collapsed-strip {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      width: 44px;
      height: 100%;
      padding: 6px 0;
      box-sizing: border-box;
      background: #f8f9fa;
    }

    .strip-spacer {
      flex: 1;
    }

    .column-footer {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      border-top: 1px solid #dee2e6;
      background: #f8f9fa;
      height: 40px;
      box-sizing: border-box;
    }

    .collapse-toggle-btn {
      width: 32px;
      height: 32px;
      line-height: 32px;
      color: #6c757d;

      &:hover {
        color: #1971c2;
        background: #e7f5ff;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .nav-column {
      display: flex;
      flex-direction: column;
      border-right: 1px solid #e9ecef;
      height: 100%;
      overflow: hidden;
    }

    .projects-column {
      width: 200px;
      min-width: 170px;
      background: #ffffff;
    }

    .years-column {
      width: 130px;
      min-width: 110px;
      background: #fdfdfd;
    }

    .months-column {
      width: 180px;
      min-width: 160px;
      background: #ffffff;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      border-bottom: 1px solid #dee2e6;
      background: #f8f9fa;
      height: 44px;
      box-sizing: border-box;
    }

    .column-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #6c757d;
    }

    .column-list {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
      font-size: 13px;
      color: #343a40;

      &:hover {
        background-color: #e9ecef;
      }

      &.active {
        background-color: #e7f5ff;
        color: #1971c2;
        font-weight: 600;

        .item-badge {
          opacity: 1;
        }
      }
    }

    .item-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      overflow: hidden;
    }

    .item-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 6px;
    }

    .item-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;

      &.badge-hours {
        background: #e6fcf5;
        color: #0ca678;
      }

      &.badge-days {
        background: #fff4e6;
        color: #d9480f;
      }
    }

    .count-badge {
      font-size: 11px;
      color: #868e96;
      font-family: monospace;
    }

    .status-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;

      &.exists-icon {
        color: #40c057;
      }
      &.empty-icon {
        color: #adb5bd;
      }
    }

    .item-action-btn {
      width: 24px;
      height: 24px;
      line-height: 24px;
      margin-left: 4px;
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .empty-hint {
      padding: 16px 8px;
      text-align: center;
      font-size: 12px;
      color: #adb5bd;
    }
  `]
})
export class TimesheetNavigationComponent {
  readonly state = inject(TimesheetStateService);
  private readonly api = inject(TimesheetApiService);
  private readonly dialog = inject(MatDialog);

  selectProject(project: ProjectConfig) {
    this.state.selectProject(project);
  }

  selectYear(year: number) {
    this.state.selectYear(year);
  }

  selectMonth(month: number) {
    this.state.selectMonth(month);
  }

  countExistingMonths(yearNode: YearNodeDTO): number {
    return yearNode.months.filter(m => m.exists).length;
  }

  formatMonthNumber(month: number): string {
    return month < 10 ? `0${month}` : `${month}`;
  }

  openAddProjectDialog() {
    const dialogRef = this.dialog.open(ProjectDialogComponent, {
      data: { isEdit: false }
    });

    dialogRef.afterClosed().subscribe((res: ProjectConfig | undefined) => {
      if (res) {
        this.api.saveProject(res).subscribe({
          next: () => {
            this.state.loadConfig();
            this.state.selectProject(res);
          }
        });
      }
    });
  }

  openEditProjectDialog(project: ProjectConfig, event: MouseEvent) {
    event.stopPropagation();
    const dialogRef = this.dialog.open(ProjectDialogComponent, {
      data: { project, isEdit: true }
    });

    dialogRef.afterClosed().subscribe((res: ProjectConfig | undefined) => {
      if (res) {
        this.api.saveProject(res).subscribe({
          next: (savedProject) => {
            const updated = savedProject || res;
            const current = this.state.selectedProject();
            if (current && (current.name.toLowerCase() === project.name.toLowerCase() || current.name.toLowerCase() === res.name.toLowerCase())) {
              this.state.selectedProject.set(updated);
            }
            this.state.loadConfig();
          }
        });
      }
    });
  }

  addNewYear() {
    const available = this.state.availableYears();
    const currentYear = new Date().getFullYear();
    const maxYear = available.length > 0
      ? Math.max(...available.map(y => y.year))
      : currentYear;

    const nextYear = maxYear + 1;
    this.state.addYear(nextYear);
  }

  goToCurrentMonth() {
    const currentMonth = new Date().getMonth() + 1;
    this.state.selectMonth(currentMonth);
  }
}
