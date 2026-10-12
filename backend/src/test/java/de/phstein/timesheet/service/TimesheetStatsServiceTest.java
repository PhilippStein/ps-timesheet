package de.phstein.timesheet.service;

import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.DayStatus;
import de.phstein.timesheet.model.ProjectStatsDTO;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class TimesheetStatsServiceTest {

    @Inject
    AppConfigService appConfigService;

    @Inject
    TimesheetStorageService storageService;

    @Inject
    TimesheetStatsService statsService;

    @TempDir
    static Path tempDir;

    private ProjectConfig workHoursProject;
    private ProjectConfig personDaysProject;

    @BeforeEach
    void setUp() {
        appConfigService.setCustomConfigPathForTesting(tempDir.resolve(".pstimesheet.yaml"));
        appConfigService.loadConfig();

        workHoursProject = new ProjectConfig(
                "StatsHoursProject",
                tempDir.resolve("HoursStats").toString(),
                "WorkHours",
                List.of()
        );
        workHoursProject.setHourlyRate(100.0);

        personDaysProject = new ProjectConfig(
                "StatsDaysProject",
                tempDir.resolve("DaysStats").toString(),
                "PersonDays",
                List.of("Dev", "Concept")
        );
        personDaysProject.setDailyRate(800.0);

        appConfigService.addOrUpdateProject(workHoursProject);
        appConfigService.addOrUpdateProject(personDaysProject);
    }

    @Test
    void testWorkHoursAnnualStatsWithRates() {
        // Prepare some data in 2026-10
        TimesheetMonthDTO month10 = storageService.loadOrCreateMonth(workHoursProject, 2026, 10);
        // Day 1: 8h work
        TimesheetDayDTO d1 = month10.getDays().get(0); // 2026-10-01
        d1.setStartTime("08:00");
        d1.setEndTime("17:00");
        d1.setPauseMinutes(60);

        // Day 2: Vacation
        TimesheetDayDTO d2 = month10.getDays().get(1); // 2026-10-02
        d2.setStatus(DayStatus.URLAUB);

        // Day 5: Sick
        TimesheetDayDTO d5 = month10.getDays().get(4); // 2026-10-05
        d5.setStatus(DayStatus.KRANK);

        // Day 6: Holiday
        TimesheetDayDTO d6 = month10.getDays().get(5); // 2026-10-06
        d6.setStatus(DayStatus.FEIERTAG);

        storageService.saveMonth(workHoursProject, 2026, 10, month10);

        ProjectStatsDTO stats = statsService.getProjectStats(workHoursProject, 2026);

        assertNotNull(stats);
        assertEquals("StatsHoursProject", stats.getProjectName());
        assertEquals("WorkHours", stats.getTemplate());
        assertEquals(2026, stats.getYear());
        assertEquals(100.0, stats.getHourlyRate());
        assertEquals(8.0, stats.getTotalLoggedUnits());
        assertEquals(1, stats.getActualWorkDays());
        assertEquals(1.0, stats.getVacationDays());
        assertEquals(1.0, stats.getSickDays());
        assertEquals(1.0, stats.getHolidayDays());

        assertNotNull(stats.getActualRevenueNet());
        assertEquals(800.0, stats.getActualRevenueNet()); // 8h * 100€
        assertTrue(stats.getMaxRevenueNet() > 0);
        assertEquals(800.0, stats.getVacationLossNet()); // 1 day * 8h * 100€
        assertEquals(800.0, stats.getSickLossNet()); // 1 day * 8h * 100€
        assertEquals(stats.getActualRevenueNet() - stats.getMaxRevenueNet(), stats.getDiffRevenueNet());

        assertEquals(12, stats.getBreakdownRows().size());
        assertEquals("10 - Oktober", stats.getBreakdownRows().get(9).getLabel());
        assertEquals(8.0, stats.getBreakdownRows().get(9).getLoggedUnits());
        assertEquals(800.0, stats.getBreakdownRows().get(9).getRevenueNet());
    }

    @Test
    void testPersonDaysAnnualStatsWithTaskSummaries() {
        TimesheetMonthDTO month10 = storageService.loadOrCreateMonth(personDaysProject, 2026, 10);
        TimesheetDayDTO d1 = month10.getDays().get(0);
        d1.getTaskAllocations().put("Dev", 0.75);
        d1.getTaskAllocations().put("Concept", 0.25);
        d1.setLocation("Remote");

        TimesheetDayDTO d2 = month10.getDays().get(1);
        d2.getTaskAllocations().put("Dev", 1.0);
        d2.setLocation("Vor-Ort");

        storageService.saveMonth(personDaysProject, 2026, 10, month10);

        ProjectStatsDTO stats = statsService.getProjectStats(personDaysProject, 2026);

        assertNotNull(stats);
        assertEquals("PersonDays", stats.getTemplate());
        assertEquals(2.0, stats.getTotalLoggedUnits());
        assertEquals(2, stats.getActualWorkDays());
        assertEquals(1600.0, stats.getActualRevenueNet()); // 2 PT * 800€

        assertNotNull(stats.getTaskSummaries());
        assertEquals(2, stats.getTaskSummaries().size());
        assertEquals("Dev", stats.getTaskSummaries().get(0).getTaskName());
        assertEquals(1.75, stats.getTaskSummaries().get(0).getTotalPt());
        assertEquals("Concept", stats.getTaskSummaries().get(1).getTaskName());
        assertEquals(0.25, stats.getTaskSummaries().get(1).getTotalPt());
    }

    @Test
    void testStatsWithoutConfiguredRate() {
        ProjectConfig noRateProject = new ProjectConfig(
                "NoRateProject",
                tempDir.resolve("NoRate").toString(),
                "WorkHours",
                List.of()
        );
        appConfigService.addOrUpdateProject(noRateProject);

        ProjectStatsDTO stats = statsService.getProjectStats(noRateProject, 2026);
        assertNotNull(stats);
        assertNull(stats.getActualRevenueNet());
        assertNull(stats.getMaxRevenueNet());
        assertNull(stats.getVacationLossNet());
        assertNull(stats.getSickLossNet());
        assertNull(stats.getDiffRevenueNet());
        assertNull(stats.getBreakdownRows().get(0).getRevenueNet());
    }

    @Test
    void testAllTimeProjectStats() {
        TimesheetMonthDTO m2025 = storageService.loadOrCreateMonth(workHoursProject, 2025, 5);
        TimesheetDayDTO d1 = m2025.getDays().get(0);
        d1.setStartTime("08:00");
        d1.setEndTime("16:00");
        d1.setPauseMinutes(0);
        storageService.saveMonth(workHoursProject, 2025, 5, m2025);

        TimesheetMonthDTO m2026 = storageService.loadOrCreateMonth(workHoursProject, 2026, 10);
        TimesheetDayDTO d2 = m2026.getDays().get(0);
        d2.setStartTime("08:00");
        d2.setEndTime("18:00");
        d2.setPauseMinutes(60);
        storageService.saveMonth(workHoursProject, 2026, 10, m2026);

        ProjectStatsDTO totalStats = statsService.getProjectStats(workHoursProject, null);
        assertNotNull(totalStats);
        assertNull(totalStats.getYear());
        assertEquals(17.0, totalStats.getTotalLoggedUnits()); // 8h + 9h
        assertEquals(2, totalStats.getActualWorkDays());
        assertTrue(totalStats.getBreakdownRows().size() >= 2);
    }
}
