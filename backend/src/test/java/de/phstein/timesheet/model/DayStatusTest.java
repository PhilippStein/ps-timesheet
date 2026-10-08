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
}
