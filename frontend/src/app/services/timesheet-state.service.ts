import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subject, concatMap, catchError, debounceTime, distinctUntilChanged, of, tap } from 'rxjs';
import { AppConfigDTO, AppConfigUpdateDTO, PdfExportConfig, ProjectConfig, ProjectTreeDTO, YearNodeDTO, MonthNodeDTO } from '../models/project.model';
import { DayStatus, TimesheetDay, TimesheetMonth } from '../models/timesheet.model';
import { ProjectStats } from '../models/project-stats.model';
import { TimesheetApiService } from './timesheet-api.service';

@Injectable({
  providedIn: 'root'
})
export class TimesheetStateService {
  private readonly api = inject(TimesheetApiService);

  // State Signals
  readonly projects = signal<ProjectConfig[]>([]);
  readonly selectedProject = signal<ProjectConfig | null>(null);
  readonly tree = signal<ProjectTreeDTO | null>(null);
  readonly selectedYear = signal<number | null>(null);
  readonly selectedMonth = signal<number | null>(null);
  readonly activeMonthData = signal<TimesheetMonth | null>(null);
  readonly activeView = signal<'month-editor' | 'year-stats' | 'project-stats'>('month-editor');
  readonly projectStats = signal<ProjectStats | null>(null);
  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isNavCollapsed = signal<boolean>(false);
  readonly hideEmptyWeekends = signal<boolean>(false);
  readonly pdfExport = signal<PdfExportConfig | undefined>(undefined);
  readonly configPath = signal<string>('');

  // Derived Computations
  readonly availableYears = computed<YearNodeDTO[]>(() => {
    return this.tree()?.years ?? [];
  });

  readonly availableMonths = computed<MonthNodeDTO[]>(() => {
    const year = this.selectedYear();
    const tree = this.tree();
    if (!year || !tree) return [];
    const yearNode = tree.years.find(y => y.year === year);
    return yearNode?.months ?? [];
  });

  readonly isWorkHoursTemplate = computed(() => {
    const tmpl = this.selectedProject()?.template;
    return tmpl === 'WorkHours' || tmpl === 'Temp1' || tmpl === 'Arbeitszeit';
  });

  readonly isPersonDaysTemplate = computed(() => {
    const tmpl = this.selectedProject()?.template;
    return tmpl === 'PersonDays' || tmpl === 'Temp2' || tmpl === 'Personentage';
  });

  private readonly saveSubject = new Subject<TimesheetMonth>();

  constructor() {
    this.initAutoSave();
    this.loadConfig();
  }

  loadConfig() {
    if (typeof this.api?.getConfig !== 'function') {
      this.loadProjects();
      return;
    }
    this.isLoading.set(true);
    this.api.getConfig().subscribe({
      next: (cfg) => {
        this.configPath.set(cfg.configPath);
        this.hideEmptyWeekends.set(cfg.hideEmptyWeekends ?? false);
        this.pdfExport.set(cfg.pdfExport);
        this.projects.set(cfg.projects);
        this.isLoading.set(false);
        this.updateSelectedProjectFromList(cfg.projects);
      },
      error: () => {
        this.loadProjects();
      }
    });
  }

  saveGlobalSettings(hideEmptyWeekends: boolean, pdfExport?: PdfExportConfig): Observable<AppConfigDTO> {
    const payload: AppConfigUpdateDTO = {
      projects: this.projects(),
      hideEmptyWeekends,
      pdfExport
    };
    return this.api.updateConfig(payload).pipe(
      tap(saved => {
        this.hideEmptyWeekends.set(saved.hideEmptyWeekends ?? hideEmptyWeekends);
        this.pdfExport.set(saved.pdfExport ?? pdfExport);
        if (saved.configPath) {
          this.configPath.set(saved.configPath);
        }
      })
    );
  }

  exportPdf(month?: number) {
    const proj = this.selectedProject()?.name;
    const year = this.selectedYear();
    const m = month ?? this.selectedMonth();
    if (!proj || !year || !m) return;
    this.api.downloadPdf(proj, year, m).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const monthPad = m < 10 ? `0${m}` : `${m}`;
        a.download = `${proj}_${year}_${monthPad}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('PDF export failed', err);
        this.errorMessage.set('PDF Export fehlgeschlagen: ' + (err.error?.message || err.message || 'Unbekannter Fehler'));
      }
    });
  }

  private initAutoSave() {
    this.saveSubject.pipe(
      debounceTime(400),
      concatMap(monthData => {
        this.saveStatus.set('saving');
        return this.api.saveMonth(monthData.projectName, monthData.year, monthData.month, monthData).pipe(
          catchError(err => {
            console.error('Auto-save error', err);
            this.saveStatus.set('error');
            return of(null);
          })
        );
      })
    ).subscribe({
      next: (saved) => {
        if (!saved) return;
        const current = this.activeMonthData();
        if (current && current.projectName === saved.projectName && current.year === saved.year && current.month === saved.month) {
          this.activeMonthData.set(saved);
        }
        this.saveStatus.set('saved');
        if (this.selectedProject()?.name === saved.projectName) {
          this.refreshTreeSilently();
        }
      }
    });
  }

  loadProjects() {
    this.isLoading.set(true);
    this.api.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.isLoading.set(false);
        this.updateSelectedProjectFromList(projs);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Projekte konnten nicht geladen werden.');
      }
    });
  }

  private updateSelectedProjectFromList(projs: ProjectConfig[]) {
    if (!projs || projs.length === 0) {
      this.selectedProject.set(null);
      this.tree.set(null);
      this.activeMonthData.set(null);
      this.selectedYear.set(null);
      this.selectedMonth.set(null);
      return;
    }
    const current = this.selectedProject();
    if (!current) {
      this.selectProject(projs[0]);
      return;
    }
    const matching = projs.find(p => p.name.toLowerCase() === current.name.toLowerCase());
    if (matching) {
      this.selectedProject.set(matching);
    } else {
      this.selectProject(projs[0]);
    }
  }

  selectProject(project: ProjectConfig) {
    this.selectedProject.set(project);
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api.getProjectTree(project.name).subscribe({
      next: (tree) => {
        if (this.selectedProject()?.name !== project.name) {
          return;
        }
        this.tree.set(tree);
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // Choose target year: existing year matching currentYear, or newest year in tree, or currentYear
        let targetYear = currentYear;
        if (tree.years.length > 0) {
          const match = tree.years.find(y => y.year === currentYear);
          targetYear = match ? match.year : tree.years[0].year;
        }

        if (this.activeView() === 'project-stats') {
          this.selectedYear.set(null);
          this.selectedMonth.set(null);
          this.loadStats(null);
        } else if (this.activeView() === 'year-stats') {
          this.selectedYear.set(targetYear);
          this.selectedMonth.set(null);
          this.loadStats(targetYear);
        } else {
          this.activeView.set('month-editor');
          this.selectedYear.set(targetYear);
          this.selectedMonth.set(currentMonth);
          this.loadActiveMonth(project.name, targetYear, currentMonth);
        }
      },
      error: (err) => {
        if (this.selectedProject()?.name === project.name) {
          this.isLoading.set(false);
          this.errorMessage.set(`Ordnerstruktur für ${project.name} konnte nicht geladen werden.`);
        }
      }
    });
  }

  selectYear(year: number) {
    this.selectedYear.set(year);
    const proj = this.selectedProject();
    if (!proj) return;

    if (this.activeView() === 'year-stats') {
      this.selectedMonth.set(null);
      this.loadStats(year);
    } else {
      if (this.activeView() === 'project-stats') {
        this.activeView.set('month-editor');
      }
      const currentMonth = this.selectedMonth() ?? (new Date().getMonth() + 1);
      this.selectedMonth.set(currentMonth);
      this.loadActiveMonth(proj.name, year, currentMonth);
    }
  }

  selectMonth(month: number) {
    this.activeView.set('month-editor');
    this.selectedMonth.set(month);
    const proj = this.selectedProject();
    const year = this.selectedYear();
    if (!proj || !year) return;

    this.loadActiveMonth(proj.name, year, month);
  }

  showYearStats(year?: number) {
    const targetYear = year ?? this.selectedYear() ?? (this.tree()?.years[0]?.year ?? new Date().getFullYear());
    this.selectedYear.set(targetYear);
    this.selectedMonth.set(null);
    this.activeView.set('year-stats');
    this.loadStats(targetYear);
  }

  showProjectStats() {
    this.selectedYear.set(null);
    this.selectedMonth.set(null);
    this.activeView.set('project-stats');
    this.loadStats(null);
  }

  loadStats(year?: number | null) {
    const proj = this.selectedProject();
    if (!proj) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const projName = proj.name;
    this.api.getProjectStats(projName, year).subscribe({
      next: (stats) => {
        if (this.selectedProject()?.name === projName) {
          this.projectStats.set(stats);
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        if (this.selectedProject()?.name === projName) {
          this.isLoading.set(false);
          this.errorMessage.set(`Statistiken für ${projName} konnten nicht geladen werden.`);
        }
      }
    });
  }

  loadActiveMonth(projectName: string, year: number, month: number) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api.getMonth(projectName, year, month).subscribe({
      next: (data) => {
        if (
          this.selectedProject()?.name === projectName &&
          this.selectedYear() === year &&
          this.selectedMonth() === month
        ) {
          this.activeMonthData.set(data);
          this.isLoading.set(false);
          this.refreshTreeSilently();
        }
      },
      error: (err) => {
        if (
          this.selectedProject()?.name === projectName &&
          this.selectedYear() === year &&
          this.selectedMonth() === month
        ) {
          this.isLoading.set(false);
          this.errorMessage.set(`Monatsdaten für ${year}-${month} konnten nicht geladen werden.`);
        }
      }
    });
  }

  addYear(year: number) {
    const proj = this.selectedProject();
    if (!proj) return;
    this.selectYear(year);
  }

  addMonth(month: number) {
    const proj = this.selectedProject();
    const year = this.selectedYear();
    if (!proj || !year) return;
    this.selectMonth(month);
  }

  updateActiveMonthData(mutator: (data: TimesheetMonth) => void) {
    const current = this.activeMonthData();
    if (!current) return;

    const copy: TimesheetMonth = JSON.parse(JSON.stringify(current));
    mutator(copy);
    this.recalculateClientSide(copy);
    this.activeMonthData.set(copy);
    this.saveSubject.next(copy);
  }

  toggleNavCollapsed() {
    this.isNavCollapsed.update(v => !v);
  }

  setNavCollapsed(collapsed: boolean) {
    this.isNavCollapsed.set(collapsed);
  }

  forceSave() {
    const current = this.activeMonthData();
    if (!current) return;
    this.saveStatus.set('saving');
    this.api.saveMonth(current.projectName, current.year, current.month, current).subscribe({
      next: (saved) => {
        const active = this.activeMonthData();
        if (active && active.projectName === saved.projectName && active.year === saved.year && active.month === saved.month) {
          this.activeMonthData.set(saved);
        }
        this.saveStatus.set('saved');
        if (this.selectedProject()?.name === saved.projectName) {
          this.refreshTreeSilently();
        }
      },
      error: (err) => {
        this.saveStatus.set('error');
      }
    });
  }

  duplicateDay(fromIndex: number, toIndex: number) {
    const current = this.activeMonthData();
    if (!current || fromIndex < 0 || toIndex < 0 || fromIndex >= current.days.length || toIndex >= current.days.length) {
      return;
    }

    this.updateActiveMonthData(month => {
      const source = month.days[fromIndex];
      const target = month.days[toIndex];

      target.status = source.status;
      target.location = source.location;

      // WorkHours template duplication
      target.startTime = source.startTime;
      target.endTime = source.endTime;
      target.pauseMinutes = source.pauseMinutes;
      target.comment = source.comment;

      // PersonDays template duplication
      target.taskAllocations = source.taskAllocations ? { ...source.taskAllocations } : {};
      target.notes = source.notes;
      target.notesList = source.notesList ? [...source.notesList] : undefined;
    });
  }

  private recalculateClientSide(month: TimesheetMonth) {
    const isWeekend = (d: TimesheetDay) => !!(d.isWeekend || d.weekend || d.dayOfWeek === 'Samstag' || d.dayOfWeek === 'Sonntag' || d.dayOfWeek === 'Saturday' || d.dayOfWeek === 'Sunday');
    const isVacationOrSick = (d: TimesheetDay) => d.status === DayStatus.URLAUB || d.status === 'Urlaub' || d.status === DayStatus.KRANK || d.status === 'Krank' || d.status === DayStatus.FEIERTAG || d.status === 'Feiertag' || d.location === 'Urlaub' || d.location === 'Krank' || d.location === 'Feiertag';

    month.workingDays = (month.days || []).filter(d => !isWeekend(d) && !isVacationOrSick(d)).length;

    if (this.isWorkHoursTemplate()) {
      let total = 0;
      for (const day of month.days) {
        if (day.startTime && day.endTime) {
          try {
            const [sh, sm] = day.startTime.split(':').map(Number);
            const [eh, em] = day.endTime.split(':').map(Number);
            const startMin = sh * 60 + (sm || 0);
            const endMin = eh * 60 + (em || 0);
            const pause = day.pauseMinutes || 0;
            const netMin = Math.max(0, (endMin - startMin) - pause);
            day.netHours = Math.round((netMin / 60) * 100) / 100;
            total += day.netHours;
          } catch {
            day.netHours = undefined;
          }
        } else {
          day.netHours = undefined;
        }
      }
      month.totalNetHours = Math.round(total * 100) / 100;
    } else {
      let monthTotal = 0;
      const taskTotals: Record<string, number> = {};
      for (const t of month.taskColumns || []) {
        taskTotals[t] = 0;
      }

      for (const day of month.days) {
        let dayPt = 0;
        if (day.taskAllocations) {
          for (const [task, pt] of Object.entries(day.taskAllocations)) {
            if (pt != null && !isNaN(pt)) {
              dayPt += pt;
              taskTotals[task] = (taskTotals[task] || 0) + pt;
            }
          }
        }
        day.totalPt = Math.round(dayPt * 100) / 100;
        monthTotal += day.totalPt;
      }

      for (const k of Object.keys(taskTotals)) {
        taskTotals[k] = Math.round(taskTotals[k] * 100) / 100;
      }

      month.totalPt = Math.round(monthTotal * 100) / 100;
      month.taskTotals = taskTotals;
    }
  }

  private refreshTreeSilently() {
    const proj = this.selectedProject();
    if (!proj) return;
    this.api.getProjectTree(proj.name).subscribe(tree => {
      this.tree.set(tree);
    });
  }
}
