import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimesheetNavigationComponent } from './components/navigation/timesheet-navigation.component';
import { WorkHoursEditorComponent } from './components/work-hours-editor/work-hours-editor.component';
import { PersonDaysEditorComponent } from './components/person-days-editor/person-days-editor.component';
import { TimesheetStateService } from './services/timesheet-state.service';
import { DateUtils } from './utils/date-utils';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TimesheetNavigationComponent,
    WorkHoursEditorComponent,
    PersonDaysEditorComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly state = inject(TimesheetStateService);

  getMonthName(month: number | null): string {
    if (!month) return '';
    return DateUtils.getGermanMonthName(month);
  }

  forceSave() {
    this.state.forceSave();
  }
}
