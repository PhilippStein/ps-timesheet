package de.phstein.timesheet.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DayStatus {
    URLAUB("Urlaub"),
    KRANK("Krank");

    private final String value;

    DayStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static DayStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (DayStatus status : DayStatus.values()) {
            if (status.name().equalsIgnoreCase(value.trim()) || status.value.equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        return null;
    }

    @Override
    public String toString() {
        return value;
    }
}
