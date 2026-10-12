package de.phstein.timesheet.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProjectStatsDTO {

    private String projectName;
    private String template; // "WorkHours" or "PersonDays"
    private Integer year; // null for total/all-time stats
    private Double hourlyRate;
    private Double dailyRate;

    private Double totalLoggedUnits = 0.0; // hours (WorkHours) or PT (PersonDays)
    private Integer actualWorkDays = 0;
    private Integer possibleWorkDays = 0;
    private Double vacationDays = 0.0;
    private Double sickDays = 0.0;
    private Double holidayDays = 0.0;
    private Double utilizationPercent = 0.0;

    // Financial KPIs (null if no rate configured)
    private Double actualRevenueNet;
    private Double maxRevenueNet;
    private Double vacationLossNet;
    private Double sickLossNet;
    private Double diffRevenueNet;

    private List<StatsBreakdownRowDTO> breakdownRows = new ArrayList<>();
    private List<TaskStatSummaryDTO> taskSummaries = new ArrayList<>();

    public ProjectStatsDTO() {
    }

    public ProjectStatsDTO(String projectName, String template, Integer year) {
        this.projectName = projectName;
        this.template = template;
        this.year = year;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public String getTemplate() {
        return template;
    }

    public void setTemplate(String template) {
        this.template = template;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Double getHourlyRate() {
        return hourlyRate;
    }

    public void setHourlyRate(Double hourlyRate) {
        this.hourlyRate = hourlyRate;
    }

    public Double getDailyRate() {
        return dailyRate;
    }

    public void setDailyRate(Double dailyRate) {
        this.dailyRate = dailyRate;
    }

    public Double getTotalLoggedUnits() {
        return totalLoggedUnits;
    }

    public void setTotalLoggedUnits(Double totalLoggedUnits) {
        this.totalLoggedUnits = totalLoggedUnits;
    }

    public Integer getActualWorkDays() {
        return actualWorkDays;
    }

    public void setActualWorkDays(Integer actualWorkDays) {
        this.actualWorkDays = actualWorkDays;
    }

    public Integer getPossibleWorkDays() {
        return possibleWorkDays;
    }

    public void setPossibleWorkDays(Integer possibleWorkDays) {
        this.possibleWorkDays = possibleWorkDays;
    }

    public Double getVacationDays() {
        return vacationDays;
    }

    public void setVacationDays(Double vacationDays) {
        this.vacationDays = vacationDays;
    }

    public Double getSickDays() {
        return sickDays;
    }

    public void setSickDays(Double sickDays) {
        this.sickDays = sickDays;
    }

    public Double getHolidayDays() {
        return holidayDays;
    }

    public void setHolidayDays(Double holidayDays) {
        this.holidayDays = holidayDays;
    }

    public Double getUtilizationPercent() {
        return utilizationPercent;
    }

    public void setUtilizationPercent(Double utilizationPercent) {
        this.utilizationPercent = utilizationPercent;
    }

    public Double getActualRevenueNet() {
        return actualRevenueNet;
    }

    public void setActualRevenueNet(Double actualRevenueNet) {
        this.actualRevenueNet = actualRevenueNet;
    }

    public Double getMaxRevenueNet() {
        return maxRevenueNet;
    }

    public void setMaxRevenueNet(Double maxRevenueNet) {
        this.maxRevenueNet = maxRevenueNet;
    }

    public Double getVacationLossNet() {
        return vacationLossNet;
    }

    public void setVacationLossNet(Double vacationLossNet) {
        this.vacationLossNet = vacationLossNet;
    }

    public Double getSickLossNet() {
        return sickLossNet;
    }

    public void setSickLossNet(Double sickLossNet) {
        this.sickLossNet = sickLossNet;
    }

    public Double getDiffRevenueNet() {
        return diffRevenueNet;
    }

    public void setDiffRevenueNet(Double diffRevenueNet) {
        this.diffRevenueNet = diffRevenueNet;
    }

    public List<StatsBreakdownRowDTO> getBreakdownRows() {
        return breakdownRows;
    }

    public void setBreakdownRows(List<StatsBreakdownRowDTO> breakdownRows) {
        this.breakdownRows = breakdownRows != null ? breakdownRows : new ArrayList<>();
    }

    public List<TaskStatSummaryDTO> getTaskSummaries() {
        return taskSummaries;
    }

    public void setTaskSummaries(List<TaskStatSummaryDTO> taskSummaries) {
        this.taskSummaries = taskSummaries != null ? taskSummaries : new ArrayList<>();
    }
}
