package de.phstein.timesheet.service;

import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CsvWorkHoursHandlerTest {

    private CsvWorkHoursHandler handler;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        handler = new CsvWorkHoursHandler();
    }

    @Test
    void shouldCreateEmptyMonthWithAllDays() {
        TimesheetMonthDTO month = handler.createEmptyMonth("TestProj", 2026, 2, List.of());

        assertThat(month.getYear()).isEqualTo(2026);
        assertThat(month.getMonth()).isEqualTo(2);
        assertThat(month.getTemplate()).isEqualTo("WorkHours");
        assertThat(month.getDays()).hasSize(28); // 2026 is non-leap year

        TimesheetDayDTO firstDay = month.getDays().get(0);
        assertThat(firstDay.getDate()).isEqualTo("2026-02-01");
        assertThat(firstDay.getDayOfWeek()).isEqualTo("Sonntag");
        assertThat(firstDay.isWeekend()).isTrue();
    }

    @Test
    void shouldCalculateNetHoursAccurately() {
        TimesheetDayDTO day = new TimesheetDayDTO("2026-10-01", "Donnerstag", false);
        day.setStartTime("08:30");
        day.setEndTime("17:00");
        day.setPauseMinutes(30);

        CsvWorkHoursHandler.calculateNetHours(day);
        assertThat(day.getNetHours()).isEqualTo(8.0);

        day.setStartTime("09:00");
        day.setEndTime("17:45");
        day.setPauseMinutes(45);
        CsvWorkHoursHandler.calculateNetHours(day);
        assertThat(day.getNetHours()).isEqualTo(8.0);
    }

    @Test
    void shouldWriteAndReadWorkHoursCsv() throws IOException {
        Path csvFile = tempDir.resolve("2026_10_TestProj_WorkHours.csv");
        TimesheetMonthDTO month = handler.createEmptyMonth("TestProj", 2026, 10, List.of());

        TimesheetDayDTO day1 = month.getDays().get(0); // 2026-10-01
        day1.setStartTime("08:30");
        day1.setEndTime("17:00");
        day1.setPauseMinutes(30);
        day1.setComment("Architektur & Design");

        TimesheetDayDTO day2 = month.getDays().get(1); // 2026-10-02
        day2.setStartTime("09:00");
        day2.setEndTime("17:30");
        day2.setPauseMinutes(45);
        day2.setComment("Implementierung REST API");

        handler.writeMonth(csvFile, month);

        assertThat(Files.exists(csvFile)).isTrue();
        List<String> lines = Files.readAllLines(csvFile);
        assertThat(lines.get(0)).isEqualTo("Date;DayOfWeek;StartTime;EndTime;PauseMinutes;Comment");
        assertThat(lines.get(1)).isEqualTo("2026-10-01;Donnerstag;08:30;17:00;30;Architektur & Design");
        assertThat(lines.get(2)).isEqualTo("2026-10-02;Freitag;09:00;17:30;45;Implementierung REST API");

        // Read back
        TimesheetMonthDTO loaded = handler.readMonth(csvFile, "TestProj", 2026, 10);
        assertThat(loaded.getDays()).hasSize(31);
        assertThat(loaded.getTotalNetHours()).isEqualTo(15.75); // 8.0 + 7.75

        TimesheetDayDTO loadedDay1 = loaded.getDays().get(0);
        assertThat(loadedDay1.getStartTime()).isEqualTo("08:30");
        assertThat(loadedDay1.getEndTime()).isEqualTo("17:00");
        assertThat(loadedDay1.getPauseMinutes()).isEqualTo(30);
        assertThat(loadedDay1.getNetHours()).isEqualTo(8.0);
        assertThat(loadedDay1.getComment()).isEqualTo("Architektur & Design");
    }
}
