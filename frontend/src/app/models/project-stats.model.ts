export interface TaskStatSummary {
  taskName: string;
  totalPt: number;
}

export interface StatsBreakdownRow {
  label: string;
  periodKey: number;
  loggedUnits: number;
  actualWorkDays: number;
  possibleWorkDays: number;
  vacationDays: number;
  sickDays: number;
  holidayDays: number;
  revenueNet?: number | null;
}

export interface ProjectStats {
  projectName: string;
  template: 'WorkHours' | 'PersonDays' | string;
  year?: number | null;
  hourlyRate?: number | null;
  dailyRate?: number | null;
  totalLoggedUnits: number;
  actualWorkDays: number;
  possibleWorkDays: number;
  vacationDays: number;
  sickDays: number;
  holidayDays: number;
  utilizationPercent: number;
  actualRevenueNet?: number | null;
  maxRevenueNet?: number | null;
  vacationLossNet?: number | null;
  sickLossNet?: number | null;
  diffRevenueNet?: number | null;
  breakdownRows: StatsBreakdownRow[];
  taskSummaries?: TaskStatSummary[];
}
