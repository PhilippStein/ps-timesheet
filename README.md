# PS-Timesheet

**PS-Timesheet** ist eine leichtgewichtige, lokale Zeiterfassungs-Webanwendung, bestehend aus einem **Quarkus 3.40.1 (Java 25)** REST-Backend und einem **Angular 22 + Angular Material** Frontend.

Die Datenhaltung erfolgt rein dateibasiert im Dateisystem in menschenlesbaren CSV-Dateien und einer zentralen YAML-Konfiguration. Es ist keine externe Datenbank und keine Authentifizierung erforderlich.

---

## Funktionen & Highlights

- **OneNote-Style 3-Spalten-Navigation & Auswertungen**:
  - **Spalte 1 (Projekte)**: Projektliste mit Vorlagen-Badge, Stundensatz-/Tagessatz-Konfiguration und `+ Projekt`-Aktion für Einstellungen & Löschung.
  - **Spalte 2 (Jahre)**: Erkannte Jahresverzeichnisse mit CSV-Zähler, `+ Jahr`-Aktion und `[ 📊 Gesamtübersicht ]` für projektübergreifende Mehrjahres-KPIs.
  - **Spalte 3 (Monate)**: Monate 1–12 mit Existenz-Indikator, `+ Monat`-Aktion und `[ 📊 Jahresübersicht ]` für detaillierte Jahresstatistiken.
- **Zwei Zeiterfassungs-Vorlagen**:
  - **WorkHours (Arbeitszeit)**: Erfassung von Startzeit (`HH:mm`), Endzeit (`HH:mm`), Pausendauer (min) und Kommentar. Nettoarbeitsstunden werden on-the-fly im Browser und Backend berechnet (keine redundante CSV-Spalte).
  - **PersonDays (Personentage)**: Dynamische Aufgaben-Spalten für Personentage (PT) pro Monat und strukturierte Tätigkeiten/Aufzählungen.
- **Interaktiver PersonDays-Workflow**:
  - **Drag & Drop**: Verschieben von Tätigkeiten zwischen Tagen; Kopieren durch Halten der `⌥ Option`-Taste (macOS) bzw. `Strg`/`Alt`-Taste (Windows/Linux) mit sichtbarem Plus-Badge.
  - **Inline-Editing**: Direktes Bearbeiten von Tätigkeiten per Doppelklick.
  - **Tätigkeits-Vorlagen**: Schnelles Einfügen wiederkehrender Aufgaben über Aktionsmenüs.
  - **Status-Kopplung**: Automatische Synchronisation von Urlaub, Krank und Feiertag mit dem Arbeitstage-Status.
- **Status & Arbeitstage-Berechnung**:
  - Unterstützung für `Regulär`, `Urlaub`, `Krank` und `Feiertag`.
  - Exakte Netto-Arbeitstageberechnung (automatische Bereinigung um Wochenenden, Feiertage, Urlaubs- und Krankheitstage).
- **Stundensätze, Tagessätze & Rechnungsbeträge**:
  - Projektbezogene Konfiguration von Stundensatz (`hourlyRate`) oder Tagessatz (`dailyRate`) in Euro.
  - Dynamische Anzeige des monatlichen Netto-Rechnungsbetrags direkt über der Zeiterfassungstabelle (automatisch ausgeblendet, falls kein Satz hinterlegt ist).
- **Projekt- & Jahresstatistiken**:
  - KPI-Karten für Ist-Umsatz, maximales Erlöspotenzial, Arbeitstage/Auslastungsgrad und Abwesenheiten.
  - Tabellarische Aufschlüsselung nach Monaten bzw. Jahren.
  - Aufgaben-/Task-Verteilung der geleisteten Personentage (`PersonDays`).
  - Detaillierte Ertrags- und Ausfallanalyse (Verdienstentfall durch Urlaub, Krankheit oder Minderleistung).
- **Druckfertiger PDF-Export**:
  - Hochwertige PDF-Generierung mit OpenPDF und eingebetteter „PT Sans“-Typografie (11pt).
  - Unterstützung für kundenspezifisches PDF-Briefpapier/Briefbögen als Hintergrund mit konfigurierbaren Schutzzonen (`marginTopMm`, `marginBottomMm`, `marginLeftMm`, `marginRightMm`).
  - Vorlagenlayouts:
    - **PersonDays**: Formeller *Leistungsschein* mit dynamischen Task-Spalten, formatierten Tätigkeitslisten, zentrierten Werten und zweistufigem Summenfooter.
    - **WorkHours**: Strukturierte Monatstabelle mit automatischer Wochenendfilterung (nur befüllte Wochenenden), hellgrau hervorgehobenen Wochen- und Monatssummen sowie kompakter Dezimalstatistik.
  - Automatische Tabellenkopf-Wiederholung auf Folgeseiten und dynamische Paginierung (`Seite X/Y`).
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

Die Konfiguration wird zentral in `~/.pstimesheet.yaml` verwaltet und kann globale PDF-Export-Parameter sowie projektspezifische Sätze und Texte definieren:

```yaml
# Globale Einstellungen für den PDF-Export (optional)
pdfExport:
  templatePdfPath: "/Users/user/Documents/Briefpapier.pdf"  # Optionaler Pfad zu Hintergrund-PDF
  marginTopMm: 35.0                                        # Header-Schutzzone (Abstand oben)
  marginBottomMm: 25.0                                     # Footer-Schutzzone (Abstand unten)
  marginLeftMm: 15.0
  marginRightMm: 15.0

projects:
  - name: "Kundenprojekt Alpha"
    basePath: "/Users/user/timesheets/Alpha"
    template: "WorkHours"
    hourlyRate: 95.00                                      # Optional: Stundensatz in € (Netto)
    pdfHeaderTitle: "Tätigkeitsnachweis Entwicklung"       # Optional: Eigener Titel im PDF
    pdfFooterText: "Leistung wie vereinbart erbracht.\nZahlbar rein netto innerhalb von 14 Tagen."
  - name: "Kundenprojekt Beta"
    basePath: "/Users/user/timesheets/Beta"
    template: "PersonDays"
    dailyRate: 950.00                                      # Optional: Tagessatz in € (Netto)
    defaultTasks:
      - "Konzeption"
      - "Entwicklung"
      - "Review & Test"
    pdfFooterText: "Vielen Dank für die gute Zusammenarbeit."
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

### 2. Lokale Entwicklung

Für die reguläre lokale Nutzung und Backend-Entwicklung reicht es völlig aus, **nur die Quarkus-Anwendung** zu starten. Das gebaute Frontend wird automatisch unter **`http://localhost:8080`** bereitgestellt:

```bash
cd backend
mvn quarkus:dev
```

#### Frontend Live-Reload (Optional)

Die separate Ausführung des Angular-Dev-Servers ist nur dann notwendig, wenn aktiv am Frontend gearbeitet wird und Live-Reload im Browser gewünscht ist:

**Terminal 1 (Backend Dev Server):**
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
Das Frontend mit Hot-Reload läuft unter **`http://localhost:4200`** und leitet alle API-Aufrufe automatisch an `http://localhost:8080` weiter.

---

## Tests ausführen

```bash
# Backend- & Integrationstests
mvn test

# Frontend-Komponententests
cd frontend
npm test -- --watch=false
```

---

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).
