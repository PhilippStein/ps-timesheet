package de.phstein.timesheet.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class YearNodeDTO {

    private int year;
    private List<MonthNodeDTO> months = new ArrayList<>();

    public YearNodeDTO() {
    }

    public YearNodeDTO(int year) {
        this.year = year;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public List<MonthNodeDTO> getMonths() {
        return months;
    }

    public void setMonths(List<MonthNodeDTO> months) {
        this.months = months != null ? new ArrayList<>(months) : new ArrayList<>();
    }
}
