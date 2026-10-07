package de.phstein.timesheet.service;

import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.MonthNodeDTO;
import de.phstein.timesheet.model.ProjectTreeDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import de.phstein.timesheet.model.YearNodeDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TimesheetStorageServiceTest {

    private TimesheetStorageService storageService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        storageService = new TimesheetStorageService();
        storageService.workHoursHandler = new CsvWorkHoursHandler();
        storageService.personDaysHandler = new CsvPersonDaysHandler();
    }

    @Test
    void shouldAutoCreateYearFolderAndMonthCsv() {
        ProjectConfig project = new ProjectConfig("AutoTest", tempDir.resolve("AutoTest").toString(), "WorkHours", List.of());

        TimesheetMonthDTO month = storageService.loadOrCreateMonth(project, 2026, 5);

        assertThat(month).isNotNull();
        assertThat(month.getDays()).hasSize(31);
        Path expectedCsv = tempDir.resolve("AutoTest").resolve("2026").resolve("2026_05_AutoTest_WorkHours.csv");
        assertThat(Files.exists(expectedCsv)).isTrue();
    }

    @Test
    void shouldScanProjectTreeWithExistingCsvs() throws IOException {
        Path projectBase = tempDir.resolve("ScanProj");
        Path year2025 = projectBase.resolve("2025");
        Path year2026 = projectBase.resolve("2026");
        Files.createDirectories(year2025);
        Files.createDirectories(year2026);

        Files.createFile(year2025.resolve("2025_11_ScanProj_WorkHours.csv"));
        Files.createFile(year2025.resolve("2025_12_ScanProj_WorkHours.csv"));
        Files.createFile(year2026.resolve("2026_01_ScanProj_WorkHours.csv"));

        ProjectConfig project = new ProjectConfig("ScanProj", projectBase.toString(), "WorkHours", List.of());
        ProjectTreeDTO tree = storageService.getProjectTree(project);

        assertThat(tree.getProjectName()).isEqualTo("ScanProj");
        assertThat(tree.getYears()).extracting(YearNodeDTO::getYear).contains(2026, 2025);

        YearNodeDTO node2025 = tree.getYears().stream().filter(y -> y.getYear() == 2025).findFirst().orElseThrow();
        MonthNodeDTO month11 = node2025.getMonths().get(10); // index 10 = month 11
        MonthNodeDTO month12 = node2025.getMonths().get(11); // index 11 = month 12
        MonthNodeDTO month10 = node2025.getMonths().get(9);

        assertThat(month11.isExists()).isTrue();
        assertThat(month11.getFileName()).isEqualTo("2025_11_ScanProj_WorkHours.csv");
        assertThat(month12.isExists()).isTrue();
        assertThat(month10.isExists()).isFalse();
    }
}
