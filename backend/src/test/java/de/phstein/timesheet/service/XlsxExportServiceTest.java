package de.phstein.timesheet.service;

import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.DayStatus;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class XlsxExportServiceTest {

    private XlsxExportService xlsxExportService;
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

        xlsxExportService = new XlsxExportService();
        xlsxExportService.appConfigService = appConfigService;
        xlsxExportService.storageService = storageService;
    }

    @Test
    void testExportWorkHoursXlsx() throws Exception {
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

        byte[] xlsxBytes = xlsxExportService.exportTimesheetXlsx("HoursProject", 2026, 10);
        assertThat(xlsxBytes).isNotNull();
        assertThat(xlsxBytes.length).isGreaterThan(100);

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsxBytes))) {
            assertThat(wb.getNumberOfSheets()).isEqualTo(1);
            XSSFSheet sheet = wb.getSheetAt(0);
            assertThat(sheet.getSheetName()).isEqualTo("Oktober 2026");

            // Header row 1
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Oktober");
            assertThat(sheet.getRow(0).getCell(1).getStringCellValue()).isEqualTo("2026");
            assertThat(sheet.getRow(0).getCell(2).getStringCellValue()).isEqualTo("Tätigkeitsnachweis Entwicklung");
            assertThat(sheet.getRow(0).getCell(5).getStringCellValue()).isEqualTo("31.10.2026");

            // Header row 2
            assertThat(sheet.getRow(1).getCell(0).getStringCellValue()).isEqualTo("Datum");
            assertThat(sheet.getRow(1).getCell(1).getStringCellValue()).isEqualTo("Start");
            assertThat(sheet.getRow(1).getCell(2).getStringCellValue()).isEqualTo("Ende");
            assertThat(sheet.getRow(1).getCell(3).getStringCellValue()).isEqualTo("Pause");
            assertThat(sheet.getRow(1).getCell(4).getStringCellValue()).isEqualTo("Summe");
            assertThat(sheet.getRow(1).getCell(5).getStringCellValue()).isEqualTo("Bemerkung");

            // Data row 1
            assertThat(sheet.getRow(2).getCell(0).getStringCellValue()).isEqualTo("01.10.2026");
            assertThat(sheet.getRow(2).getCell(1).getStringCellValue()).isEqualTo("08:00");
            assertThat(sheet.getRow(2).getCell(2).getStringCellValue()).isEqualTo("16:30");
            assertThat(sheet.getRow(2).getCell(3).getStringCellValue()).isEqualTo("00:30");
            assertThat(sheet.getRow(2).getCell(4).getStringCellValue()).isEqualTo("08:00");
            assertThat(sheet.getRow(2).getCell(5).getStringCellValue()).isEqualTo("Backend Konzeption");

            // Data row 2 (Urlaub)
            assertThat(sheet.getRow(3).getCell(0).getStringCellValue()).isEqualTo("02.10.2026");
            assertThat(sheet.getRow(3).getCell(5).getStringCellValue()).isEqualTo("Urlaub");
        }
    }

    @Test
    void testExportPersonDaysXlsx() throws Exception {
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

        byte[] xlsxBytes = xlsxExportService.exportTimesheetXlsx("DaysProject", 2026, 10);
        assertThat(xlsxBytes).isNotNull();
        assertThat(xlsxBytes.length).isGreaterThan(100);

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsxBytes))) {
            assertThat(wb.getNumberOfSheets()).isEqualTo(1);
            XSSFSheet sheet = wb.getSheetAt(0);

            // Title row
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Leistungsschein Oktober 2026");

            // Header row
            assertThat(sheet.getRow(2).getCell(0).getStringCellValue()).isEqualTo("Datum");
            assertThat(sheet.getRow(2).getCell(1).getStringCellValue()).isEqualTo("Concept");
            assertThat(sheet.getRow(2).getCell(2).getStringCellValue()).isEqualTo("Dev");
            assertThat(sheet.getRow(2).getCell(3).getStringCellValue()).isEqualTo("Tätigkeit");
            assertThat(sheet.getRow(2).getCell(4).getStringCellValue()).isEqualTo("Ort");

            // Data row 1
            assertThat(sheet.getRow(3).getCell(1).getStringCellValue()).isEqualTo("8");
            assertThat(sheet.getRow(3).getCell(3).getStringCellValue()).contains("Architektur & POI");
            assertThat(sheet.getRow(3).getCell(4).getStringCellValue()).isEqualTo("Remote");

            // Data row 2
            assertThat(sheet.getRow(4).getCell(2).getStringCellValue()).isEqualTo("4.5");
            assertThat(sheet.getRow(4).getCell(3).getStringCellValue()).contains("Integration");
            assertThat(sheet.getRow(4).getCell(4).getStringCellValue()).isEqualTo("Vor-Ort");
        }
    }

    @Test
    void testExportXlsxInvalidMonth() {
        assertThatThrownBy(() -> xlsxExportService.exportTimesheetXlsx("AnyProject", 2026, 13))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void testExportXlsxProjectNotFound() {
        assertThatThrownBy(() -> xlsxExportService.exportTimesheetXlsx("NonExistent", 2026, 10))
                .isInstanceOf(NotFoundException.class);
    }
}
