import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TimesheetStateService } from '../../services/timesheet-state.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">settings</mat-icon> Globale Einstellungen
    </h2>
    <mat-dialog-content class="dialog-content">
      <div class="settings-container">
        @if (state.configPath()) {
          <div class="config-path-info">
            <span class="info-label">Konfigurationsdatei:</span>
            <code class="config-path font-mono">{{ state.configPath() }}</code>
          </div>
        }

        <div class="setting-item">
          <mat-slide-toggle [(ngModel)]="hideEmptyWeekends" color="primary">
            Leere Wochenendzeilen ausblenden
          </mat-slide-toggle>
          <p class="setting-description">
            Wochenendtage (Samstag, Sonntag) ohne erfasste Zeiten oder Aufgaben werden in der Tabelle automatisch verborgen.
          </p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Abbrechen</button>
      <button mat-flat-button color="primary" [disabled]="isSaving" (click)="save()">
        {{ isSaving ? 'Speichern...' : 'Speichern' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      min-width: 440px;
      max-width: 560px;
    }
    .title-icon {
      vertical-align: middle;
      margin-right: 8px;
    }
    .settings-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 8px;
    }
    .config-path-info {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-label {
      font-size: 12px;
      color: #6c757d;
      font-weight: 500;
    }
    .config-path {
      font-size: 13px;
      color: #212529;
      word-break: break-all;
    }
    .setting-item {
      padding: 12px;
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 6px;
    }
    .setting-description {
      margin: 8px 0 0 0;
      font-size: 13px;
      color: #6c757d;
      line-height: 1.4;
    }
  `]
})
export class SettingsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  readonly state = inject(TimesheetStateService);

  hideEmptyWeekends: boolean = this.state.hideEmptyWeekends();
  isSaving = false;

  save() {
    this.isSaving = true;
    this.state.saveGlobalSettings(this.hideEmptyWeekends).subscribe({
      next: () => {
        this.isSaving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Failed to save settings', err);
      }
    });
  }
}
