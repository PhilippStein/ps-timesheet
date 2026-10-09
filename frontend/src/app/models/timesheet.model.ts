export enum DayStatus {
  URLAUB = 'Urlaub',
  KRANK = 'Krank'
}

export interface TimesheetDay {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  weekend?: boolean;
  status?: DayStatus | string | null;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  pauseMinutes?: number | null;
  comment?: string | null;
  netHours?: number | null;
  taskAllocations?: Record<string, number>;
  notes?: string | null;
  notesList?: string[];
  totalPt?: number | null;
}

export interface TimesheetMonth {
  projectName: string;
  year: number;
  month: number;
  template: 'WorkHours' | 'PersonDays' | string;
  taskColumns: string[];
  days: TimesheetDay[];
  totalNetHours?: number;
  totalPt?: number;
  taskTotals?: Record<string, number>;
  workingDays?: number;
}
