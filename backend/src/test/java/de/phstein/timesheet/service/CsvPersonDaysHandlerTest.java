package de.phstein.timesheet.service;

import de.phstein.timesheet.model.DayStatus;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CsvPersonDaysHandlerTest {

    private CsvPersonDaysHandler handler;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        handler = new CsvPersonDaysHandler();
    }

    @Test
    void shouldCreateEmptyMonthWithDefaultTasks() {
        TimesheetMonthDTO month = handler.createEmptyMonth("Alpha", 2026, 3, List.of("Konzeption", "Entwicklung", "Review"));

        assertThat(month.getTemplate()).isEqualTo("PersonDays");
        assertThat(month.getTaskColumns()).containsExactly("Konzeption", "Entwicklung", "Review");
        assertThat(month.getDays()).hasSize(31);
        assertThat(month.getTotalPt()).isEqualTo(0.0);
    }

    @Test
    void shouldWriteAndReadPersonDaysWithMultilineNotes() throws IOException {
        Path csvFile = tempDir.resolve("2026_03_Alpha_PersonDays.csv");
        TimesheetMonthDTO month = handler.createEmptyMonth("Alpha", 2026, 3, List.of("Konzeption", "Entwicklung", "Review"));

        TimesheetDayDTO day3 = month.getDays().get(2); // 2026-03-03
        day3.setTaskAllocations(Map.of("Konzeption", 0.25, "Entwicklung", 0.75));
        day3.setNotes("- Meilenstein 1 erfolgreich abgeschlossen\n- Deployment vorbereitet");

        TimesheetDayDTO day4 = month.getDays().get(3); // 2026-03-04
        day4.setTaskAllocations(Map.of("Entwicklung", 0.8, "Review", 0.2));
        day4.setNotes("- Bugfix im Backend");
        day4.setStatus(DayStatus.KRANK);

        handler.writeMonth(csvFile, month);

        assertThat(Files.exists(csvFile)).isTrue();

        // Read back
        TimesheetMonthDTO loaded = handler.readMonth(csvFile, "Alpha", 2026, 3);
        assertThat(loaded.getTaskColumns()).containsExactly("Konzeption", "Entwicklung", "Review");
        assertThat(loaded.getTotalPt()).isEqualTo(2.0); // 1.0 + 1.0

        TimesheetDayDTO loadedDay3 = loaded.getDays().get(2);
        assertThat(loadedDay3.getTaskAllocations()).containsEntry("Konzeption", 0.25);
        assertThat(loadedDay3.getTaskAllocations()).containsEntry("Entwicklung", 0.75);
        assertThat(loadedDay3.getTotalPt()).isEqualTo(1.0);
        assertThat(loadedDay3.getNotes()).isEqualTo("- Meilenstein 1 erfolgreich abgeschlossen\n- Deployment vorbereitet");
        assertThat(loadedDay3.getNotesList()).containsExactly("Meilenstein 1 erfolgreich abgeschlossen", "Deployment vorbereitet");
        assertThat(loadedDay3.getStatus()).isNull();

        TimesheetDayDTO loadedDay4 = loaded.getDays().get(3);
        assertThat(loadedDay4.getTaskAllocations()).containsEntry("Entwicklung", 0.8);
        assertThat(loadedDay4.getTaskAllocations()).containsEntry("Review", 0.2);
        assertThat(loadedDay4.getTotalPt()).isEqualTo(1.0);
        assertThat(loadedDay4.getNotes()).isEqualTo("- Bugfix im Backend");
        assertThat(loadedDay4.getNotesList()).containsExactly("Bugfix im Backend");
        assertThat(loadedDay4.getStatus()).isEqualTo(DayStatus.KRANK);
    }

    @Test
    void shouldHandleDynamicTaskColumnModifications() throws IOException {
        Path csvFile = tempDir.resolve("2026_04_Alpha_PersonDays.csv");
        TimesheetMonthDTO month = handler.createEmptyMonth("Alpha", 2026, 4, List.of("Dev", "QA"));

        TimesheetDayDTO day1 = month.getDays().get(0);
        day1.setTaskAllocations(Map.of("Dev", 1.0));
        handler.writeMonth(csvFile, month);

        // Add a new task "Ops" to the month
        month.getTaskColumns().add("Ops");
        TimesheetDayDTO day2 = month.getDays().get(1);
        day2.setTaskAllocations(Map.of("Dev", 0.5, "Ops", 0.5));
        handler.writeMonth(csvFile, month);

        TimesheetMonthDTO reloaded = handler.readMonth(csvFile, "Alpha", 2026, 4);
        assertThat(reloaded.getTaskColumns()).containsExactly("Dev", "QA", "Ops");
        assertThat(reloaded.getDays().get(0).getTaskAllocations()).containsEntry("Dev", 1.0);
        assertThat(reloaded.getDays().get(1).getTaskAllocations()).containsEntry("Dev", 0.5);
        assertThat(reloaded.getDays().get(1).getTaskAllocations()).containsEntry("Ops", 0.5);
        assertThat(reloaded.getTotalPt()).isEqualTo(2.0);
    }

    @Test
    void shouldWriteAndReadNotesListDirectly() {
        Path csvFile = tempDir.resolve("2026_05_Alpha_PersonDays.csv");
        TimesheetMonthDTO month = handler.createEmptyMonth("Alpha", 2026, 5, List.of("Dev"));

        TimesheetDayDTO day1 = month.getDays().get(0);
        day1.setTaskAllocations(Map.of("Dev", 1.0));
        day1.setNotesList(List.of("Daily", "SP Weekly", "Code Review"));

        handler.writeMonth(csvFile, month);

        TimesheetMonthDTO reloaded = handler.readMonth(csvFile, "Alpha", 2026, 5);
        TimesheetDayDTO reloadedDay1 = reloaded.getDays().get(0);
        assertThat(reloadedDay1.getNotesList()).containsExactly("Daily", "SP Weekly", "Code Review");
        assertThat(reloadedDay1.getNotes()).isEqualTo("- Daily\n- SP Weekly\n- Code Review");
    }
}
