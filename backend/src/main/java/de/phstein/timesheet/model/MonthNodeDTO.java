package de.phstein.timesheet.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MonthNodeDTO {

    private int month; // 1 - 12
    private String monthName; // "Januar", "Februar", etc.
    private boolean exists;
    private String fileName;

    public MonthNodeDTO() {
    }

    public MonthNodeDTO(int month, String monthName, boolean exists, String fileName) {
        this.month = month;
        this.monthName = monthName;
        this.exists = exists;
        this.fileName = fileName;
    }

    public int getMonth() {
        return month;
    }

    public void setMonth(int month) {
        this.month = month;
    }

    public String getMonthName() {
        return monthName;
    }

    public void setMonthName(String monthName) {
        this.monthName = monthName;
    }

    public boolean isExists() {
        return exists;
    }

    public void setExists(boolean exists) {
        this.exists = exists;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
}
