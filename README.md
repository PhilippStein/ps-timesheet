# PS-Timesheet

**PS-Timesheet** ist eine leichtgewichtige, lokale Zeiterfassungs-Webanwendung, bestehend aus einem **Quarkus 3.40.1 (Java 25)** REST-Backend und einem **Angular 22 + Angular Material** Frontend.

Die Datenhaltung erfolgt rein dateibasiert im Dateisystem in menschenlesbaren CSV-Dateien und einer zentralen YAML-Konfiguration. Es ist keine externe Datenbank und keine Authentifizierung erforderlich.

---

## Funktionen & Highlights

- **OneNote-Style 3-Spalten-Navigation**:
  - **Spalte 1 (Projekte)**: Projektliste mit Vorlagen-Badge und `+ Projekt`-Aktion für Einstellungen.
  - **Spalte 2 (Jahre)**: Erkannte Jahresverzeichnisse mit CSV-Zähler und `+ Jahr`-Aktion.
  - **Spalte 3 (Monate)**: Monate 1–12 mit Existenz-Indikator und `+ Monat`-Aktion.
- **Zwei Zeiterfassungs-Vorlagen**:
  - **WorkHours (Arbeitszeit)**: Erfassung von Startzeit (`HH:mm`), Endzeit (`HH:mm`), Pausendauer (min) und Kommentar. Nettoarbeitsstunden werden on-the-fly im Browser und Backend berechnet (keine redundante CSV-Spalte).
  - **PersonDays (Personentage)**: Dynamische Aufgaben-Spalten für Personentage (PT) pro Monat und mehrzeilige Notizen/Bulletpoints direkt in der `Notes`-Spalte des jeweiligen Tages.
- **Tastatur-Ergonomie & Spreadsheet-Flow**:
  - `Tab` / `Shift+Tab`: Horizontale Zellennavigation.
  - `Enter`: Vertikaler Sprung in dieselbe Spalte des nächsten Kalendertags.
  - `Ctrl+D` / `Cmd+D`: Vollständige Zeilen-Duplikation des Vortags (Uhrzeiten, PT-Aufteilungen und Notizen).
  - `Ctrl+Enter`: Notizen übernehmen und zur nächsten Zeile springen.
  - Smart Time Parsing: Eingaben wie `8` $\rightarrow$ `08:00`, `830` $\rightarrow$ `08:30`, `8.5` $\rightarrow$ `08:30`.
- **Automatische Initialisierung & Speicherung**:
  - Bei Navigation zu einem Monat wird bei Bedarf das Jahresverzeichnis und die Monats-CSV mit allen Kalendertagen automatisch erzeugt.
  - Debounced Auto-Save im Hintergrund beim Verlassen des Eingabefeldes mit visueller Statusanzeige.
  - Atomare Schreibvorgänge (Staging über `.tmp`-Dateien und Rename) zum Schutz vor Dateikorruption.

---

## Konfiguration (`~/.pstimesheet.yaml`)

Beim ersten Start wird automatisch eine Standardkonfiguration in `~/.pstimesheet.yaml` angelegt:

```yaml
projects:
  - name: "Blubb"
    basePath: "/Users/user/timesheets/Blubb"
    template: "WorkHours"
  - name: "ProjectAlpha"
    basePath: "/Users/user/timesheets/ProjectAlpha"
    template: "PersonDays"
    defaultTasks:
      - "Konzeption"
      - "Entwicklung"
      - "Review & Test"
```

Alternativ kann der Pfad zur Konfigurationsdatei über die Umgebungsvariable `PSTIMESHEET_CONFIG_PATH` oder den Parameter `timesheet.config.path` überschrieben werden.

---

## Dateistruktur im Dateisystem

Die CSV-Dateien werden nach dem Schema `<basePath>/<yyyy>/<yyyy>_<MM>_<projectName>_<templateName>.csv` abgelegt:

### WorkHours CSV Schema
```csv
Date;DayOfWeek;StartTime;EndTime;PauseMinutes;Comment
2026-10-01;Donnerstag;08:30;17:00;30;Architektur & Design
2026-10-02;Freitag;09:00;17:30;45;Implementierung REST API
```

### PersonDays CSV Schema
```csv
Date;DayOfWeek;Konzeption;Entwicklung;Review & Test;Notes
2026-10-01;Donnerstag;0.25;0.75;;- Meilenstein 1 abgeschlossen
2026-10-02;Freitag;;0.8;0.2;"- Bugfix im Backend
- Code Review PR #4"
```

---

## Bauen & Starten

### Voraussetzungen
- Java 25 JDK
- Maven 3.9+
- Node.js 20+ und npm

### 1. Produktions-Build & Starten (Single Java Process)

Der gesamte Build (Angular Frontend-Build + Quarkus Backend-Paketierung) wird über Maven ausgeführt:

```bash
mvn clean package
java -jar backend/target/quarkus-app/quarkus-run.jar
```

Die Anwendung steht anschließend unter **`http://localhost:8080`** bereit.

---

### 2. Lokale Entwicklung (Live-Reload)

Für gleichzeitige Frontend- und Backend-Entwicklung mit Hot-Reload:

**Terminal 1 (Quarkus Dev Server):**
```bash
cd backend
mvn quarkus:dev
```
Backend läuft auf `http://localhost:8080`.

**Terminal 2 (Angular Dev Server mit API-Proxy):**
```bash
cd frontend
npm start
```
Frontend läuft auf `http://localhost:4200` und leitet API-Aufrufe automatisch an `http://localhost:8080` weiter.

---

## Tests ausführen

```bash
# Backend- & Integrationstests
mvn test

# Frontend-Komponententests
cd frontend
npm test -- --watch=false
```
