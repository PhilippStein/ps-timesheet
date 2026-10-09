package de.phstein.timesheet.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DayStatusTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldParseFromValueCaseInsensitively() {
        assertThat(DayStatus.fromValue("Urlaub")).isEqualTo(DayStatus.URLAUB);
        assertThat(DayStatus.fromValue("urlaub")).isEqualTo(DayStatus.URLAUB);
        assertThat(DayStatus.fromValue("URLAUB")).isEqualTo(DayStatus.URLAUB);

        assertThat(DayStatus.fromValue("Krank")).isEqualTo(DayStatus.KRANK);
        assertThat(DayStatus.fromValue("krank")).isEqualTo(DayStatus.KRANK);
        assertThat(DayStatus.fromValue("KRANK")).isEqualTo(DayStatus.KRANK);

        assertThat(DayStatus.fromValue("Feiertag")).isEqualTo(DayStatus.FEIERTAG);
        assertThat(DayStatus.fromValue("feiertag")).isEqualTo(DayStatus.FEIERTAG);
        assertThat(DayStatus.fromValue("FEIERTAG")).isEqualTo(DayStatus.FEIERTAG);

        assertThat(DayStatus.fromValue(null)).isNull();
        assertThat(DayStatus.fromValue("")).isNull();
        assertThat(DayStatus.fromValue("   ")).isNull();
        assertThat(DayStatus.fromValue("Unknown")).isNull();
    }

    @Test
    void shouldSerializeAndDeserializeJson() throws Exception {
        TimesheetDayDTO day = new TimesheetDayDTO();
        day.setStatus(DayStatus.URLAUB);

        String json = objectMapper.writeValueAsString(day);
        assertThat(json).contains("\"status\":\"Urlaub\"");

        TimesheetDayDTO deserialized = objectMapper.readValue(json, TimesheetDayDTO.class);
        assertThat(deserialized.getStatus()).isEqualTo(DayStatus.URLAUB);

        String jsonUpper = "{\"status\":\"URLAUB\"}";
        TimesheetDayDTO deserializedUpper = objectMapper.readValue(jsonUpper, TimesheetDayDTO.class);
        assertThat(deserializedUpper.getStatus()).isEqualTo(DayStatus.URLAUB);
    }

    @Test
    void shouldCalculateWorkingDaysExcludingWeekendsAndVacationAndSickAndHoliday() {
        TimesheetMonthDTO month = new TimesheetMonthDTO();

        TimesheetDayDTO workDay1 = new TimesheetDayDTO("2026-10-01", "Donnerstag", false);
        TimesheetDayDTO workDay2 = new TimesheetDayDTO("2026-10-02", "Freitag", false);
        
        TimesheetDayDTO weekend1 = new TimesheetDayDTO("2026-10-03", "Samstag", true);
        TimesheetDayDTO weekend2 = new TimesheetDayDTO("2026-10-04", "Sonntag", true);

        TimesheetDayDTO vacationDay = new TimesheetDayDTO("2026-10-05", "Montag", false);
        vacationDay.setStatus(DayStatus.URLAUB);

        TimesheetDayDTO sickDay = new TimesheetDayDTO("2026-10-06", "Dienstag", false);
        sickDay.setStatus(DayStatus.KRANK);

        TimesheetDayDTO holidayDay = new TimesheetDayDTO("2026-10-07", "Mittwoch", false);
        holidayDay.setStatus(DayStatus.FEIERTAG);

        TimesheetDayDTO locationVacationDay = new TimesheetDayDTO("2026-10-08", "Donnerstag", false);
        locationVacationDay.setLocation("Urlaub");

        TimesheetDayDTO locationHolidayDay = new TimesheetDayDTO("2026-10-09", "Freitag", false);
        locationHolidayDay.setLocation("Feiertag");

        TimesheetDayDTO workDay3 = new TimesheetDayDTO("2026-10-12", "Montag", false);

        month.setDays(java.util.List.of(workDay1, workDay2, weekend1, weekend2, vacationDay, sickDay, holidayDay, locationVacationDay, locationHolidayDay, workDay3));

        assertThat(month.calculateWorkingDays()).isEqualTo(3);
        assertThat(month.getWorkingDays()).isEqualTo(3);
    }
}
