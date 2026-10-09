import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TimesheetStateService } from '../../services/timesheet-state.service';
import { PdfExportConfig } from '../../models/project.model';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
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

        <div class="setting-item">
          <label class="section-label">PDF-Export &amp; Briefpapier (Global):</label>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Briefpapier Vorlage (PDF Pfad)</mat-label>
            <input matInput [(ngModel)]="templatePdfPath" placeholder="z.B. ~/briefpapier.pdf">
            <mat-hint>Hintergrund-PDF für den Monats-Export (optional)</mat-hint>
          </mat-form-field>

          <label class="sub-label">Sperrbereiche / Ränder (in mm):</label>
          <div class="margins-grid">
            <mat-form-field appearance="outline">
              <mat-label>Oben (Header)</mat-label>
              <input matInput type="number" step="0.5" min="0" [(ngModel)]="marginTopMm" placeholder="20">
              <span matTextSuffix>mm</span>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Unten (Footer)</mat-label>
              <input matInput type="number" step="0.5" min="0" [(ngModel)]="marginBottomMm" placeholder="20">
              <span matTextSuffix>mm</span>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Links</mat-label>
              <input matInput type="number" step="0.5" min="0" [(ngModel)]="marginLeftMm" placeholder="15">
              <span matTextSuffix>mm</span>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Rechts</mat-label>
              <input matInput type="number" step="0.5" min="0" [(ngModel)]="marginRightMm" placeholder="15">
              <span matTextSuffix>mm</span>
            </mat-form-field>
          </div>
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
      min-width: 480px;
      max-width: 580px;
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
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .setting-description {
      margin: 0;
      font-size: 13px;
      color: #6c757d;
      line-height: 1.4;
    }
    .section-label {
      font-size: 14px;
      font-weight: 500;
      color: #212529;
    }
    .sub-label {
      font-size: 12px;
      font-weight: 500;
      color: #6c757d;
      margin-top: 4px;
    }
    .full-width {
      width: 100%;
    }
    .margins-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
  `]
})
export class SettingsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  readonly state = inject(TimesheetStateService);

  hideEmptyWeekends: boolean = this.state.hideEmptyWeekends();
  templatePdfPath: string = this.state.pdfExport()?.templatePdfPath ?? '';
  marginTopMm: number = this.state.pdfExport()?.marginTopMm ?? 20;
  marginBottomMm: number = this.state.pdfExport()?.marginBottomMm ?? 20;
  marginLeftMm: number = this.state.pdfExport()?.marginLeftMm ?? 15;
  marginRightMm: number = this.state.pdfExport()?.marginRightMm ?? 15;

  isSaving = false;

  save() {
    this.isSaving = true;
    const pdfExport: PdfExportConfig = {
      templatePdfPath: this.templatePdfPath?.trim() || undefined,
      marginTopMm: Number(this.marginTopMm) || 20,
      marginBottomMm: Number(this.marginBottomMm) || 20,
      marginLeftMm: Number(this.marginLeftMm) || 15,
      marginRightMm: Number(this.marginRightMm) || 15
    };

    this.state.saveGlobalSettings(this.hideEmptyWeekends, pdfExport).subscribe({
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
