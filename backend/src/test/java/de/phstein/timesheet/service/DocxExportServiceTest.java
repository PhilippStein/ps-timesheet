package de.phstein.timesheet.service;

import de.phstein.timesheet.config.AppConfig;
import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.PdfExportConfig;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.DayStatus;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFHeader;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.openpdf.text.Document;
import org.openpdf.text.Paragraph;
import org.openpdf.text.pdf.PdfWriter;

import java.io.ByteArrayInputStream;
import java.io.FileOutputStream;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DocxExportServiceTest {

    private DocxExportService docxExportService;
    private AppConfigService appConfigService;
    private TimesheetStorageService storageService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        appConfigService = new AppConfigService();
        appConfigService.setCustomConfigPathForTesting(tempDir.resolve(".pstimesheet.yaml"));
        appConfigService.loadConfig();

        storageService = new TimesheetStorageService();
        storageService.workHoursHandler = new CsvWorkHoursHandler();
        storageService.personDaysHandler = new CsvPersonDaysHandler();

        docxExportService = new DocxExportService();
        docxExportService.appConfigService = appConfigService;
        docxExportService.storageService = storageService;
    }

    @Test
    void testExportWorkHoursDocx() throws Exception {
        ProjectConfig project = new ProjectConfig("HoursProject", tempDir.resolve("HoursDir").toString(), "WorkHours", List.of());
        project.setPdfHeaderTitle("Tätigkeitsnachweis Entwicklung");
        project.setPdfFooterText("Leistung wie vereinbart erbracht.\nZahlbar rein netto.");
        appConfigService.addOrUpdateProject(project);

        TimesheetMonthDTO month = storageService.loadOrCreateMonth(project, 2026, 10);
        TimesheetDayDTO day1 = month.getDays().get(0);
        day1.setStartTime("08:00");
        day1.setEndTime("16:30");
        day1.setPauseMinutes(30);
        day1.setNetHours(8.0);
        day1.setComment("Backend Konzeption");

        TimesheetDayDTO day2 = month.getDays().get(1);
        day2.setStatus(DayStatus.URLAUB);

        storageService.saveMonth(project, 2026, 10, month);

        byte[] docxBytes = docxExportService.exportTimesheetDocx("HoursProject", 2026, 10);
        assertThat(docxBytes).isNotNull();
        assertThat(docxBytes.length).isGreaterThan(100);

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(docxBytes))) {
            List<XWPFTable> tables = doc.getTables();
            assertThat(tables).hasSizeGreaterThanOrEqualTo(2);

            XWPFTable mainTable = tables.get(0);
            assertThat(mainTable.getCTTbl().getTblPr().getTblW().getW()).isEqualTo(java.math.BigInteger.valueOf(10206));
            assertThat(mainTable.getCTTbl().getTblGrid().getGridColList()).hasSize(6);
            // Bemerkung column (index 5) should have all extra width (~4956 dxa)
            assertThat(((java.math.BigInteger) mainTable.getCTTbl().getTblGrid().getGridColList().get(5).getW()).longValue()).isGreaterThan(4000L);

            // Header row 1
            assertThat(mainTable.getRow(0).getCell(0).getText()).isEqualTo("Oktober");
            assertThat(mainTable.getRow(0).getCell(1).getText()).isEqualTo("2026");
            assertThat(mainTable.getRow(0).getCell(2).getText()).isEqualTo("Tätigkeitsnachweis Entwicklung");
            assertThat(mainTable.getRow(0).getCell(3).getText()).isEqualTo("31.10.2026");

            // Header row 2
            assertThat(mainTable.getRow(1).getCell(0).getText()).isEqualTo("Datum");
            assertThat(mainTable.getRow(1).getCell(1).getText()).isEqualTo("Start");
            assertThat(mainTable.getRow(1).getCell(2).getText()).isEqualTo("Ende");
            assertThat(mainTable.getRow(1).getCell(3).getText()).isEqualTo("Pause");
            assertThat(mainTable.getRow(1).getCell(4).getText()).isEqualTo("Summe");
            assertThat(mainTable.getRow(1).getCell(5).getText()).isEqualTo("Bemerkung");

            // Data row 1
            assertThat(mainTable.getRow(2).getCell(0).getText()).isEqualTo("01.10.2026");
            assertThat(mainTable.getRow(2).getCell(1).getText()).isEqualTo("08:00");
            assertThat(mainTable.getRow(2).getCell(2).getText()).isEqualTo("16:30");
            assertThat(mainTable.getRow(2).getCell(3).getText()).isEqualTo("00:30");
            assertThat(mainTable.getRow(2).getCell(4).getText()).isEqualTo("08:00");
            assertThat(mainTable.getRow(2).getCell(5).getText()).isEqualTo("Backend Konzeption");

            // Data row 2 (Urlaub)
            assertThat(mainTable.getRow(3).getCell(0).getText()).isEqualTo("02.10.2026");
            assertThat(mainTable.getRow(3).getCell(5).getText()).isEqualTo("Urlaub");

            // Stat Table
            XWPFTable statTable = tables.get(1);
            assertThat(statTable.getRow(0).getCell(0).getText()).isEqualTo("Arbeitstage");
            assertThat(statTable.getRow(1).getCell(0).getText()).isEqualTo("Sollstunden");
            assertThat(statTable.getRow(2).getCell(0).getText()).isEqualTo("Ist-Stunden");
            assertThat(statTable.getRow(2).getCell(1).getText()).isEqualTo("8.00");
            assertThat(statTable.getRow(4).getCell(0).getText()).isEqualTo("Urlaub");
            assertThat(statTable.getRow(4).getCell(1).getText()).isEqualTo("1.0");

            // Footer pagination
            assertThat(doc.getFooterList()).isNotEmpty();
            assertThat(doc.getFooterList().get(0).getText()).contains("Seite");
        }
    }

    @Test
    void testExportPersonDaysDocx() throws Exception {
        ProjectConfig project = new ProjectConfig("DaysProject", tempDir.resolve("DaysDir").toString(), "PersonDays", List.of("Concept", "Dev"));
        project.setPdfFooterText("Freigabe durch Philipp Stein");
        appConfigService.addOrUpdateProject(project);

        TimesheetMonthDTO month = storageService.loadOrCreateMonth(project, 2026, 10);
        TimesheetDayDTO day1 = month.getDays().get(0);
        day1.getTaskAllocations().put("Concept", 8.0);
        day1.setNotes("- Architektur & POI\n- Code Review\n- Daily Standup");
        day1.setLocation("Remote");

        TimesheetDayDTO day2 = month.getDays().get(1);
        day2.getTaskAllocations().put("Dev", 4.5);
        day2.setNotes("Integration");
        day2.setLocation("Vor-Ort");

        storageService.saveMonth(project, 2026, 10, month);

        byte[] docxBytes = docxExportService.exportTimesheetDocx("DaysProject", 2026, 10);
        assertThat(docxBytes).isNotNull();
        assertThat(docxBytes.length).isGreaterThan(100);

        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(docxBytes))) {
            assertThat(doc.getParagraphs().get(0).getText()).isEqualTo("Leistungsschein Oktober 2026");

            List<XWPFTable> tables = doc.getTables();
            assertThat(tables).isNotEmpty();

            XWPFTable table = tables.get(0);
            assertThat(table.getCTTbl().getTblPr().getTblW().getW()).isEqualTo(java.math.BigInteger.valueOf(10206));
            // Check grid columns: Tätigkeit column (index 3) should be wide (~5906 dxa for 2 tasks)
            assertThat(table.getCTTbl().getTblGrid().getGridColList()).hasSize(5);
            assertThat(((java.math.BigInteger) table.getCTTbl().getTblGrid().getGridColList().get(3).getW()).longValue()).isGreaterThan(5000L);

            // Header
            assertThat(table.getRow(0).getCell(0).getText()).isEqualTo("Datum");
            assertThat(table.getRow(0).getCell(1).getText()).isEqualTo("Concept");
            assertThat(table.getRow(0).getCell(2).getText()).isEqualTo("Dev");
            assertThat(table.getRow(0).getCell(3).getText()).isEqualTo("Tätigkeit");
            assertThat(table.getRow(0).getCell(4).getText()).isEqualTo("Ort");

            // Day 1
            assertThat(table.getRow(1).getCell(1).getText()).isEqualTo("8");
            assertThat(table.getRow(1).getCell(3).getText()).contains("Architektur & POI");
            assertThat(table.getRow(1).getCell(4).getText()).isEqualTo("Remote");

            // Day 2
            assertThat(table.getRow(2).getCell(2).getText()).isEqualTo("4.5");
            assertThat(table.getRow(2).getCell(3).getText()).contains("Integration");
            assertThat(table.getRow(2).getCell(4).getText()).isEqualTo("Vor-Ort");

            // Sum and total rows at the bottom
            int totalRows = table.getRows().size();
            XWPFTableRow sumRow = table.getRow(totalRows - 2);
            assertThat(sumRow.getCell(0).getText()).isEqualTo("Summe");
            assertThat(sumRow.getCell(1).getText()).isEqualTo("8");
            assertThat(sumRow.getCell(2).getText()).isEqualTo("4.5");

            XWPFTableRow totalPtRow = table.getRow(totalRows - 1);
            assertThat(totalPtRow.getCell(0).getText()).isEqualTo("Gesamtzahl PT");
            assertThat(totalPtRow.getCell(1).getText()).isEqualTo("12.5");

            // Footer pagination
            assertThat(doc.getFooterList()).isNotEmpty();
            assertThat(doc.getFooterList().get(0).getText()).contains("Seite");
        }
    }

    @Test
    void testExportDocxInvalidMonth() {
        assertThatThrownBy(() -> docxExportService.exportTimesheetDocx("AnyProject", 2026, 13))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void testExportDocxProjectNotFound() {
        assertThatThrownBy(() -> docxExportService.exportTimesheetDocx("NonExistent", 2026, 10))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void testExportWithValidStationeryTemplate() throws Exception {
        Path templatePdf = tempDir.resolve("stationery.pdf");
        Document doc = new Document();
        PdfWriter.getInstance(doc, new FileOutputStream(templatePdf.toFile()));
        doc.open();
        doc.add(new Paragraph("Letterhead Stationery Header"));
        doc.close();

        AppConfig config = appConfigService.loadConfig();
        config.setPdfExport(new PdfExportConfig(templatePdf.toString(), 30.0, 25.0, 15.0, 15.0));
        appConfigService.saveConfig(config);

        ProjectConfig project = new ProjectConfig("HoursStationery", tempDir.resolve("HoursDir2").toString(), "WorkHours", List.of());
        appConfigService.addOrUpdateProject(project);

        TimesheetMonthDTO month = storageService.loadOrCreateMonth(project, 2026, 10);
        byte[] docxBytes = docxExportService.generateDocx(month, project);

        assertThat(docxBytes).isNotNull();
        assertThat(docxBytes.length).isGreaterThan(100);

        try (XWPFDocument xwpfDoc = new XWPFDocument(new ByteArrayInputStream(docxBytes))) {
            List<XWPFHeader> headers = xwpfDoc.getHeaderList();
            assertThat(headers).isNotEmpty();
            XWPFHeader header = headers.get(0);
            assertThat(header.getAllPictures()).isNotEmpty();
        }
    }

    @Test
    void testExportWithMissingStationeryThrowsBadRequest() {
        AppConfig config = appConfigService.loadConfig();
        config.setPdfExport(new PdfExportConfig("/non/existent/path/briefpapier.pdf", 30.0, 25.0, 15.0, 15.0));
        appConfigService.saveConfig(config);

        ProjectConfig project = new ProjectConfig("HoursMissingStationery", tempDir.resolve("HoursDir3").toString(), "WorkHours", List.of());
        appConfigService.addOrUpdateProject(project);

        TimesheetMonthDTO month = storageService.loadOrCreateMonth(project, 2026, 10);

        assertThatThrownBy(() -> docxExportService.generateDocx(month, project))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Briefpapier-Vorlage unter '/non/existent/path/briefpapier.pdf' wurde nicht gefunden.");
    }
}
