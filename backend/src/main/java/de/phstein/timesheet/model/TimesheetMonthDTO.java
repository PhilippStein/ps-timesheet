package de.phstein.timesheet.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TimesheetMonthDTO {

    private String projectName;
    private int year;
    private int month; // 1 - 12
    private String template; // "WorkHours" or "PersonDays"
    private List<String> taskColumns = new ArrayList<>(); // Dynamic task columns
    private List<TimesheetDayDTO> days = new ArrayList<>();

    // Calculated summary metrics (computed dynamically)
    private Double totalNetHours;
    private Double totalPt;
    private Integer workingDays;
    private Map<String, Double> taskTotals = new HashMap<>();

    public TimesheetMonthDTO() {
    }

    public TimesheetMonthDTO(String projectName, int year, int month, String template) {
        this.projectName = projectName;
        this.year = year;
        this.month = month;
        this.template = template;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public int getMonth() {
        return month;
    }

    public void setMonth(int month) {
        this.month = month;
    }

    public String getTemplate() {
        return template;
    }

    public void setTemplate(String template) {
        this.template = template;
    }

    public List<String> getTaskColumns() {
        return taskColumns;
    }

    public void setTaskColumns(List<String> taskColumns) {
        this.taskColumns = taskColumns != null ? new ArrayList<>(taskColumns) : new ArrayList<>();
    }

    public List<TimesheetDayDTO> getDays() {
        return days;
    }

    public void setDays(List<TimesheetDayDTO> days) {
        this.days = days != null ? new ArrayList<>(days) : new ArrayList<>();
    }

    public Double getTotalNetHours() {
        return totalNetHours;
    }

    public void setTotalNetHours(Double totalNetHours) {
        this.totalNetHours = totalNetHours;
    }

    public Double getTotalPt() {
        return totalPt;
    }

    public void setTotalPt(Double totalPt) {
        this.totalPt = totalPt;
    }

    public Integer getWorkingDays() {
        if (workingDays == null && days != null) {
            return calculateWorkingDays();
        }
        return workingDays;
    }

    public void setWorkingDays(Integer workingDays) {
        this.workingDays = workingDays;
    }

    public int calculateWorkingDays() {
        if (days == null) {
            return 0;
        }
        int count = 0;
        for (TimesheetDayDTO day : days) {
            if (day.isWorkDay()) {
                count++;
            }
        }
        return count;
    }

    public Map<String, Double> getTaskTotals() {
        return taskTotals;
    }

    public void setTaskTotals(Map<String, Double> taskTotals) {
        this.taskTotals = taskTotals != null ? taskTotals : new HashMap<>();
    }
}
