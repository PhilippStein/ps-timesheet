export interface ProjectConfig {
  name: string;
  basePath: string;
  template: 'WorkHours' | 'PersonDays' | string;
  defaultTasks?: string[];
}

export interface AppConfigDTO {
  configPath: string;
  projects: ProjectConfig[];
}

export interface MonthNodeDTO {
  month: number;
  monthName: string;
  exists: boolean;
  fileName?: string;
}

export interface YearNodeDTO {
  year: number;
  months: MonthNodeDTO[];
}

export interface ProjectTreeDTO {
  projectName: string;
  basePath: string;
  template: string;
  years: YearNodeDTO[];
}
