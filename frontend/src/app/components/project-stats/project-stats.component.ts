import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { ProjectStats, StatsBreakdownRow, TaskStatSummary } from '../../models/project-stats.model';

@Component({
  selector: 'app-project-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCardModule
  ],
  template: `
    <div class="stats-container">
      @if (state.projectStats(); as stats) {
        <!-- TOP VIEW HEADER BAR -->
        <header class="stats-header-bar">
          <div class="title-section">
            <mat-icon class="header-icon">query_stats</mat-icon>
            <div class="title-text-group">
              <h1 class="stats-main-title">
                @if (stats.year) {
                  Jahresübersicht {{ stats.year }}
                } @else {
                  Gesamtübersicht (Alle Jahre)
                }
              </h1>
              <span class="stats-subtitle">
                Projekt: <strong>{{ stats.projectName }}</strong>
              </span>
            </div>
          </div>

          <div class="header-badges">
            <span class="template-badge" [class.badge-hours]="!isPersonDays(stats)" [class.badge-days]="isPersonDays(stats)">
              {{ isPersonDays(stats) ? 'Personentage (PT)' : 'Arbeitszeit (Stunden)' }}
            </span>
          </div>
        </header>

        <div class="stats-scroll-content">
          <!-- KPI SUMMARY CARDS -->
          <section class="kpi-grid">
            @if (hasRate(stats)) {
              <div class="kpi-card revenue-card">
                <span class="kpi-title">Rechnungsbetrag (Ist)</span>
                <span class="kpi-value font-mono highlight-green">{{ formatCurrency(stats.actualRevenueNet) }}</span>
                <span class="kpi-subtext">
                  @if (isPersonDays(stats)) {
                    Tagessatz: {{ formatCurrency(stats.dailyRate) }}
                  } @else {
                    Stundensatz: {{ formatCurrency(stats.hourlyRate) }}
                  }
                </span>
              </div>

              <div class="kpi-card potential-card">
                <span class="kpi-title">Max. Potenzial</span>
                <span class="kpi-value font-mono">{{ formatCurrency(stats.maxRevenueNet) }}</span>
                <span class="kpi-subtext font-mono" [class.negative-diff]="(stats.diffRevenueNet ?? 0) < 0">
                  Diff: {{ formatCurrency(stats.diffRevenueNet) }}
                </span>
              </div>
            }

            <div class="kpi-card workdays-card">
              <span class="kpi-title">Arbeitstage & Auslastung</span>
              <span class="kpi-value font-mono">{{ stats.actualWorkDays }} / {{ stats.possibleWorkDays }} Tage</span>
              <span class="kpi-subtext highlight-blue">
                Auslastungsgrad: <strong>{{ formatPercent(stats.utilizationPercent) }}</strong>
              </span>
            </div>

            <div class="kpi-card absences-card">
              <span class="kpi-title">Abwesenheiten</span>
              <div class="absences-badges-list">
                <span class="absence-badge badge-vacation" matTooltip="Urlaubstage">
                  🏖️ {{ formatUnits(stats.vacationDays) }} Urlaub
                </span>
                <span class="absence-badge badge-sick" matTooltip="Krankheitstage">
                  🤒 {{ formatUnits(stats.sickDays) }} Krank
                </span>
                <span class="absence-badge badge-holiday" matTooltip="Feiertage">
                  📅 {{ formatUnits(stats.holidayDays) }} Feiertage
                </span>
              </div>
            </div>
          </section>

          <!-- BREAKDOWN TABLE -->
          <section class="stats-section">
            <div class="section-header">
              <mat-icon>table_chart</mat-icon>
              <h2>
                @if (stats.year) {
                  Monats-Aufschlüsselung {{ stats.year }}
                } @else {
                  Jahres-Aufschlüsselung
                }
              </h2>
            </div>

            <div class="table-card">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th class="col-period">{{ stats.year ? 'Monat' : 'Jahr' }}</th>
                    <th class="col-units text-right">Geleistet ({{ isPersonDays(stats) ? 'PT' : 'h' }})</th>
                    <th class="col-workdays text-center">Arbeitstage (Ist / Soll)</th>
                    <th class="col-vacation text-center">Urlaub</th>
                    <th class="col-sick text-center">Krank</th>
                    <th class="col-holiday text-center">Feiertage</th>
                    @if (hasRate(stats)) {
                      <th class="col-revenue text-right">Rechnungsbetrag (Netto)</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of stats.breakdownRows; track row.periodKey) {
                    <tr [class.has-units]="row.loggedUnits > 0">
                      <td class="col-period font-semibold">{{ row.label }}</td>
                      <td class="col-units text-right font-mono">{{ formatLoggedUnits(row.loggedUnits, isPersonDays(stats)) }}</td>
                      <td class="col-workdays text-center font-mono">{{ row.actualWorkDays }} / {{ row.possibleWorkDays }}</td>
                      <td class="col-vacation text-center">
                        @if (row.vacationDays > 0) {
                          <span class="row-tag tag-vacation">{{ formatUnits(row.vacationDays) }}</span>
                        } @else {
                          <span class="text-muted">-</span>
                        }
                      </td>
                      <td class="col-sick text-center">
                        @if (row.sickDays > 0) {
                          <span class="row-tag tag-sick">{{ formatUnits(row.sickDays) }}</span>
                        } @else {
                          <span class="text-muted">-</span>
                        }
                      </td>
                      <td class="col-holiday text-center">
                        @if (row.holidayDays > 0) {
                          <span class="row-tag tag-holiday">{{ formatUnits(row.holidayDays) }}</span>
                        } @else {
                          <span class="text-muted">-</span>
                        }
                      </td>
                      @if (hasRate(stats)) {
                        <td class="col-revenue text-right font-mono font-semibold">
                          {{ formatCurrency(row.revenueNet) }}
                        </td>
                      }
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td class="col-period font-bold">GESAMT</td>
                    <td class="col-units text-right font-mono font-bold">{{ formatLoggedUnits(stats.totalLoggedUnits, isPersonDays(stats)) }}</td>
                    <td class="col-workdays text-center font-mono font-bold">{{ stats.actualWorkDays }} / {{ stats.possibleWorkDays }}</td>
                    <td class="col-vacation text-center font-bold">{{ formatUnits(stats.vacationDays) }}</td>
                    <td class="col-sick text-center font-bold">{{ formatUnits(stats.sickDays) }}</td>
                    <td class="col-holiday text-center font-bold">{{ formatUnits(stats.holidayDays) }}</td>
                    @if (hasRate(stats)) {
                      <td class="col-revenue text-right font-mono font-bold highlight-green">{{ formatCurrency(stats.actualRevenueNet) }}</td>
                    }
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <!-- TASK BREAKDOWN (PERSONDAYS ONLY) -->
          @if (isPersonDays(stats) && stats.taskSummaries && stats.taskSummaries.length > 0) {
            <section class="stats-section">
              <div class="section-header">
                <mat-icon>pie_chart</mat-icon>
                <h2>Aufgaben-Verteilung (Personentage)</h2>
              </div>

              <div class="table-card tasks-table-card">
                <table class="stats-table">
                  <thead>
                    <tr>
                      <th class="col-taskname">Aufgabe / Task</th>
                      <th class="col-taskpt text-right">Geleistete PT</th>
                      <th class="col-taskshare text-right">Anteil (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (task of stats.taskSummaries; track task.taskName) {
                      <tr>
                        <td class="col-taskname font-semibold">{{ task.taskName }}</td>
                        <td class="col-taskpt text-right font-mono">{{ formatLoggedUnits(task.totalPt, true) }}</td>
                        <td class="col-taskshare text-right font-mono">{{ calculateTaskShare(task.totalPt, stats.totalLoggedUnits) }}</td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr class="total-row">
                      <td class="col-taskname font-bold">SUMME</td>
                      <td class="col-taskpt text-right font-mono font-bold">{{ formatLoggedUnits(stats.totalLoggedUnits, true) }}</td>
                      <td class="col-taskshare text-right font-mono font-bold">100.0 %</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          }

          <!-- EARNINGS & LOSS ANALYSIS (ONLY IF RATE CONFIGURED) -->
          @if (hasRate(stats)) {
            <section class="stats-section">
              <div class="section-header">
                <mat-icon>account_balance</mat-icon>
                <h2>Ertragsanalyse & Umsatzpotenzial</h2>
              </div>

              <div class="analysis-card">
                <div class="analysis-line potential-line">
                  <span class="analysis-label">
                    Maximal möglicher Ertrag ({{ stats.possibleWorkDays }} Tage &times; {{ isPersonDays(stats) ? '1 PT' : '8 h' }} &times; {{ isPersonDays(stats) ? formatCurrency(stats.dailyRate) : formatCurrency(stats.hourlyRate) }}):
                  </span>
                  <span class="analysis-value font-mono font-semibold">{{ formatCurrency(stats.maxRevenueNet) }}</span>
                </div>

                <div class="analysis-line loss-line">
                  <span class="analysis-label indent">
                    &minus; Davon geplanter Urlaub ({{ formatUnits(stats.vacationDays) }} &times; {{ isPersonDays(stats) ? '1 PT' : '8 h' }} &times; {{ isPersonDays(stats) ? formatCurrency(stats.dailyRate) : formatCurrency(stats.hourlyRate) }}):
                  </span>
                  <span class="analysis-value font-mono loss-text">&minus; {{ formatCurrency(stats.vacationLossNet) }}</span>
                </div>

                <div class="analysis-line loss-line">
                  <span class="analysis-label indent">
                    &minus; Davon Krankheitsausfall ({{ formatUnits(stats.sickDays) }} &times; {{ isPersonDays(stats) ? '1 PT' : '8 h' }} &times; {{ isPersonDays(stats) ? formatCurrency(stats.dailyRate) : formatCurrency(stats.hourlyRate) }}):
                  </span>
                  <span class="analysis-value font-mono loss-text">&minus; {{ formatCurrency(stats.sickLossNet) }}</span>
                </div>

                @if (getOtherLoss(stats) > 0.01) {
                  <div class="analysis-line loss-line">
                    <span class="analysis-label indent">
                      &minus; Davon Minderleistung / sonstige Ausfalltage:
                    </span>
                    <span class="analysis-value font-mono loss-text">&minus; {{ formatCurrency(getOtherLoss(stats)) }}</span>
                  </div>
                }

                <div class="analysis-divider"></div>

                <div class="analysis-line total-actual-line">
                  <span class="analysis-label font-bold">= Tatsächlicher Netto-Rechnungsbetrag:</span>
                  <span class="analysis-value font-mono font-bold highlight-green-large">{{ formatCurrency(stats.actualRevenueNet) }}</span>
                </div>
              </div>
            </section>
          }
        </div>
      } @else {
        <div class="empty-stats-card">
          <mat-icon class="empty-icon">bar_chart</mat-icon>
          <h2>Keine Statistikdaten geladen</h2>
          <p>Wähle links ein Projekt oder Jahr aus.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
      background: #f8f9fa;
    }

    .stats-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
    }

    .stats-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #ffffff;
      border-bottom: 1px solid #dee2e6;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      flex-shrink: 0;

      .title-section {
        display: flex;
        align-items: center;
        gap: 12px;

        .header-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          color: #1971c2;
        }

        .title-text-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stats-main-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #212529;
        }

        .stats-subtitle {
          font-size: 13px;
          color: #6c757d;

          strong {
            color: #343a40;
          }
        }
      }

      .template-badge {
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 12px;
        background: #e9ecef;
        color: #495057;

        &.badge-hours {
          background: #e7f5ff;
          color: #1864ab;
        }

        &.badge-days {
          background: #ebfbee;
          color: #2b8a3e;
        }
      }
    }

    .stats-scroll-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px 40px 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
      }

      .kpi-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #6c757d;
      }

      .kpi-value {
        font-size: 20px;
        font-weight: 700;
        color: #212529;
      }

      .kpi-subtext {
        font-size: 12px;
        color: #495057;

        &.negative-diff {
          color: #d32f2f;
          font-weight: 600;
        }
      }
    }

    .highlight-green {
      color: #2b8a3e !important;
    }

    .highlight-green-large {
      color: #2b8a3e !important;
      font-size: 18px;
    }

    .highlight-blue {
      color: #1971c2;
    }

    .absences-badges-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .absence-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;

      &.badge-vacation {
        background: #fff3bf;
        color: #f08c00;
      }

      &.badge-sick {
        background: #ffe3e3;
        color: #e03131;
      }

      &.badge-holiday {
        background: #f3f0ff;
        color: #6741d9;
      }
    }

    /* Sections */
    .stats-section {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: #495057;
        }

        h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #343a40;
        }
      }
    }

    .table-card {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    .tasks-table-card {
      max-width: 600px;
    }

    .stats-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;

      th {
        background: #f8f9fa;
        color: #495057;
        font-weight: 700;
        padding: 10px 14px;
        border-bottom: 2px solid #dee2e6;
        white-space: nowrap;
      }

      td {
        padding: 9px 14px;
        border-bottom: 1px solid #e9ecef;
        color: #343a40;
      }

      tr.has-units {
        background: #ffffff;
      }

      tr:hover td {
        background: #f1f3f5;
      }

      tfoot tr.total-row {
        background: #f1f3f5;
        border-top: 2px solid #ced4da;

        td {
          padding: 11px 14px;
          border-bottom: none;
        }
      }
    }

    .row-tag {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;

      &.tag-vacation {
        background: #fff3bf;
        color: #d9480f;
      }

      &.tag-sick {
        background: #ffe3e3;
        color: #c92a2a;
      }

      &.tag-holiday {
        background: #f3f0ff;
        color: #5f3dc4;
      }
    }

    .text-right {
      text-align: right;
    }

    .text-center {
      text-align: center;
    }

    .text-muted {
      color: #adb5bd;
    }

    .font-semibold {
      font-weight: 600;
    }

    .font-bold {
      font-weight: 700;
    }

    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    /* Earnings Analysis Card */
    .analysis-card {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 18px 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      max-width: 750px;

      .analysis-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        color: #343a40;

        .analysis-label.indent {
          padding-left: 16px;
          color: #495057;
        }

        .loss-text {
          color: #d32f2f;
          font-weight: 500;
        }
      }

      .analysis-divider {
        height: 1px;
        background: #ced4da;
        margin: 6px 0;
      }

      .total-actual-line {
        font-size: 15px;
      }
    }

    .empty-stats-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: #6c757d;

      .empty-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        color: #adb5bd;
      }

      h2 {
        margin: 0 0 8px 0;
        color: #343a40;
      }

      p {
        margin: 0;
      }
    }
  `]
})
export class ProjectStatsComponent {
  readonly state = inject(TimesheetStateService);

  isPersonDays(stats: ProjectStats): boolean {
    const tmpl = stats.template;
    return tmpl === 'PersonDays' || tmpl === 'Temp2' || tmpl === 'Personentage';
  }

  hasRate(stats: ProjectStats): boolean {
    return stats.actualRevenueNet != null;
  }

  formatCurrency(val?: number | null): string {
    if (val == null) return '-';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
  }

  formatPercent(val?: number | null): string {
    return `${(val ?? 0).toFixed(1)} %`;
  }

  formatUnits(val?: number | null): string {
    if (val == null) return '0';
    return val % 1 === 0 ? val.toString() : val.toFixed(1);
  }

  formatLoggedUnits(val?: number | null, isPersonDays = false): string {
    if (val == null) return isPersonDays ? '0 PT' : '0,00 h';
    if (isPersonDays) {
      const formatted = val % 1 === 0 ? val.toString() : val.toFixed(2).replace(/\.?0+$/, '');
      return `${formatted} PT`;
    } else {
      return `${val.toFixed(2)} h`;
    }
  }

  calculateTaskShare(taskPt: number, totalPt: number): string {
    if (!totalPt || totalPt <= 0) return '0.0 %';
    const share = (taskPt / totalPt) * 100.0;
    return `${share.toFixed(1)} %`;
  }

  getOtherLoss(stats: ProjectStats): number {
    const max = stats.maxRevenueNet ?? 0;
    const vac = stats.vacationLossNet ?? 0;
    const sick = stats.sickLossNet ?? 0;
    const actual = stats.actualRevenueNet ?? 0;
    const other = max - vac - sick - actual;
    return other > 0.009 ? Math.round(other * 100.0) / 100.0 : 0;
  }
}
