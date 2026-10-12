package de.phstein.timesheet.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TaskStatSummaryDTO {

    private String taskName;
    private Double totalPt;

    public TaskStatSummaryDTO() {
    }

    public TaskStatSummaryDTO(String taskName, Double totalPt) {
        this.taskName = taskName;
        this.totalPt = totalPt;
    }

    public String getTaskName() {
        return taskName;
    }

    public void setTaskName(String taskName) {
        this.taskName = taskName;
    }

    public Double getTotalPt() {
        return totalPt;
    }

    public void setTotalPt(Double totalPt) {
        this.totalPt = totalPt;
    }
}
