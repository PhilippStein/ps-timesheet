package de.phstein.timesheet.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecurringNoteConfig {

    private String text;
    private List<String> days = new ArrayList<>();

    public RecurringNoteConfig() {
    }

    public RecurringNoteConfig(String text, List<String> days) {
        this.text = text;
        if (days != null) {
            this.days = new ArrayList<>(days);
        }
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public List<String> getDays() {
        return days;
    }

    public void setDays(List<String> days) {
        this.days = days != null ? new ArrayList<>(days) : new ArrayList<>();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RecurringNoteConfig that = (RecurringNoteConfig) o;
        return Objects.equals(text, that.text) && Objects.equals(days, that.days);
    }

    @Override
    public int hashCode() {
        return Objects.hash(text, days);
    }
}
