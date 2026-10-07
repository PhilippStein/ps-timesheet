import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigDTO, ProjectConfig, ProjectTreeDTO } from '../models/project.model';
import { TimesheetMonth } from '../models/timesheet.model';

@Injectable({
  providedIn: 'root'
})
export class TimesheetApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = ''; // Relative path for proxy or same-host deployment

  getConfig(): Observable<AppConfigDTO> {
    return this.http.get<AppConfigDTO>(`${this.baseUrl}/api/config`);
  }

  getProjects(): Observable<ProjectConfig[]> {
    return this.http.get<ProjectConfig[]>(`${this.baseUrl}/api/projects`);
  }

  saveProject(project: ProjectConfig): Observable<ProjectConfig> {
    return this.http.post<ProjectConfig>(`${this.baseUrl}/api/projects`, project);
  }

  deleteProject(projectName: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/projects/${encodeURIComponent(projectName)}`);
  }

  getProjectTree(projectName: string): Observable<ProjectTreeDTO> {
    return this.http.get<ProjectTreeDTO>(`${this.baseUrl}/api/timesheets/${encodeURIComponent(projectName)}/tree`);
  }

  getMonth(projectName: string, year: number, month: number): Observable<TimesheetMonth> {
    return this.http.get<TimesheetMonth>(`${this.baseUrl}/api/timesheets/${encodeURIComponent(projectName)}/${year}/${month}`);
  }

  saveMonth(projectName: string, year: number, month: number, data: TimesheetMonth): Observable<TimesheetMonth> {
    return this.http.put<TimesheetMonth>(`${this.baseUrl}/api/timesheets/${encodeURIComponent(projectName)}/${year}/${month}`, data);
  }
}
