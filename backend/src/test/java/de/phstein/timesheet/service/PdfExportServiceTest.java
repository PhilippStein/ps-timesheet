package de.phstein.timesheet.service;

import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.PdfWriter;
import de.phstein.timesheet.config.AppConfig;
import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.PdfExportConfig;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.DayStatus;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import jakarta.ws.rs.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfExportServiceTest {

    private PdfExportService pdfExportService;
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

        PdfFontService fontService = new PdfFontService();
        fontService.init();

        PersonDaysPdfRenderer personDaysPdfRenderer = new PersonDaysPdfRenderer();
        personDaysPdfRenderer.pdfFontService = fontService;

        WorkHoursPdfRenderer workHoursPdfRenderer = new WorkHoursPdfRenderer();
        workHoursPdfRenderer.pdfFontService = fontService;

        pdfExportService = new PdfExportService();
        pdfExportService.appConfigService = appConfigService;
        pdfExportService.storageService = storageService;
        pdfExportService.pdfFontService = fontService;
        pdfExportService.personDaysPdfRenderer = personDaysPdfRenderer;
        pdfExportService.workHoursPdfRenderer = workHoursPdfRenderer;
    }

    @Test
    void testExportWorkHoursPdfWithoutStationery() throws Exception {
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

        byte[] pdfBytes = pdfExportService.generatePdf(month, project);
        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(100);

        PdfReader reader = new PdfReader(pdfBytes);
        assertThat(reader.getNumberOfPages()).isGreaterThanOrEqualTo(1);
        reader.close();
    }

    @Test
    void testExportPersonDaysPdfWithoutStationery() throws Exception {
        ProjectConfig project = new ProjectConfig("DaysProject", tempDir.resolve("DaysDir").toString(), "PersonDays", List.of("Concept", "Dev"));
        project.setPdfFooterText("Freigabe durch Philipp Stein");
        appConfigService.addOrUpdateProject(project);

        TimesheetMonthDTO month = storageService.loadOrCreateMonth(project, 2026, 10);
        TimesheetDayDTO day1 = month.getDays().get(0);
        day1.getTaskAllocations().put("Concept", 8.0);
        day1.setNotes("- Architektur & OpenPDF\n- Code Review\n- Daily Standup");
        day1.setLocation("Remote");

        TimesheetDayDTO day2 = month.getDays().get(1);
        day2.getTaskAllocations().put("Dev", 4.5);
        day2.setNotes("Integration ohne Prefix");
        day2.setLocation("Vor-Ort");

        byte[] pdfBytes = pdfExportService.generatePdf(month, project);
        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(100);

        PdfReader reader = new PdfReader(pdfBytes);
        assertThat(reader.getNumberOfPages()).isGreaterThanOrEqualTo(1);
        reader.close();

        List<String> parsed = TimesheetDayDTO.parseNotesToList("- Bullet 1\n* Bullet 2\n• Bullet 3\nPlain Text");
        assertThat(parsed).containsExactly("Bullet 1", "Bullet 2", "Bullet 3", "Plain Text");
    }

    @Test
    void testExportWithValidStationeryTemplate() throws Exception {
        // Create a dummy template PDF
        Path templatePdf = tempDir.resolve("stationery.pdf");
        Document doc = new Document();
        PdfWriter.getInstance(doc, new FileOutputStream(templatePdf.toFile()));
        doc.open();
        doc.add(new Paragraph("Letterhead Header"));
        doc.close();

        AppConfig config = appConfigService.loadConfig();
        config.setPdfExport(new PdfExportConfig(templatePdf.toString(), 30.0, 30.0, 15.0, 15.0));
        appConfigService.saveConfig(config);

        ProjectConfig project = new ProjectConfig("HoursStationery", tempDir.resolve("HoursDir2").toString(), "WorkHours", List.of());
        appConfigService.addOrUpdateProject(project);

        TimesheetMonthDTO month = storageService.loadOrCreateMonth(project, 2026, 10);
        byte[] pdfBytes = pdfExportService.generatePdf(month, project);

        assertThat(pdfBytes).isNotNull();
        PdfReader reader = new PdfReader(pdfBytes);
        assertThat(reader.getNumberOfPages()).isGreaterThanOrEqualTo(1);
        reader.close();
    }

    @Test
    void testExportWithMissingStationeryThrowsBadRequest() {
        AppConfig config = appConfigService.loadConfig();
        config.setPdfExport(new PdfExportConfig("/non/existent/path/briefpapier.pdf", 30.0, 30.0, 15.0, 15.0));
        appConfigService.saveConfig(config);

        ProjectConfig project = new ProjectConfig("HoursMissingStationery", tempDir.resolve("HoursDir3").toString(), "WorkHours", List.of());
        appConfigService.addOrUpdateProject(project);

        TimesheetMonthDTO month = storageService.loadOrCreateMonth(project, 2026, 10);

        assertThatThrownBy(() -> pdfExportService.generatePdf(month, project))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Briefpapier-Vorlage unter '/non/existent/path/briefpapier.pdf' wurde nicht gefunden.");
    }
}
