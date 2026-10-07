package de.phstein.timesheet.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.HashMap;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TimesheetDayDTO {

    private String date; // "yyyy-MM-dd"
    private String dayOfWeek; // "Montag", "Dienstag", etc.

    @JsonProperty("isWeekend")
    @JsonAlias({"weekend", "isWeekend"})
    private boolean isWeekend;

    // WorkHours fields
    private String startTime; // "HH:mm"
    private String endTime; // "HH:mm"
    private Integer pauseMinutes;
    private String comment;
    private Double netHours; // Computed on the fly

    // PersonDays fields
    private Map<String, Double> taskAllocations = new HashMap<>(); // taskName -> PT
    private String notes; // Multiline bulletpoints
    private Double totalPt; // Computed on the fly

    public TimesheetDayDTO() {
    }

    public TimesheetDayDTO(String date, String dayOfWeek, boolean isWeekend) {
        this.date = date;
        this.dayOfWeek = dayOfWeek;
        this.isWeekend = isWeekend;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(String dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    @JsonProperty("isWeekend")
    public boolean isWeekend() {
        return isWeekend;
    }

    @JsonProperty("isWeekend")
    public void setWeekend(boolean weekend) {
        isWeekend = weekend;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public Integer getPauseMinutes() {
        return pauseMinutes;
    }

    public void setPauseMinutes(Integer pauseMinutes) {
        this.pauseMinutes = pauseMinutes;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public Double getNetHours() {
        return netHours;
    }

    public void setNetHours(Double netHours) {
        this.netHours = netHours;
    }

    public Map<String, Double> getTaskAllocations() {
        return taskAllocations;
    }

    public void setTaskAllocations(Map<String, Double> taskAllocations) {
        this.taskAllocations = taskAllocations != null ? taskAllocations : new HashMap<>();
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Double getTotalPt() {
        return totalPt;
    }

    public void setTotalPt(Double totalPt) {
        this.totalPt = totalPt;
    }
}
