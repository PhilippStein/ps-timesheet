export interface TimesheetDay {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  startTime?: string | null;
  endTime?: string | null;
  pauseMinutes?: number | null;
  comment?: string | null;
  netHours?: number | null;
  taskAllocations?: Record<string, number>;
  notes?: string | null;
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
}
