package de.phstein.timesheet.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StatsBreakdownRowDTO {

    private String label; // "01 - Januar" or "2025"
    private Integer periodKey; // 1..12 for month, or year e.g. 2025
    private Double loggedUnits; // hours or PT
    private Integer actualWorkDays;
    private Integer possibleWorkDays;
    private Double vacationDays;
    private Double sickDays;
    private Double holidayDays;
    private Double revenueNet; // optional (if rate configured)

    public StatsBreakdownRowDTO() {
    }

    public StatsBreakdownRowDTO(String label, Integer periodKey) {
        this.label = label;
        this.periodKey = periodKey;
        this.loggedUnits = 0.0;
        this.actualWorkDays = 0;
        this.possibleWorkDays = 0;
        this.vacationDays = 0.0;
        this.sickDays = 0.0;
        this.holidayDays = 0.0;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public Integer getPeriodKey() {
        return periodKey;
    }

    public void setPeriodKey(Integer periodKey) {
        this.periodKey = periodKey;
    }

    public Double getLoggedUnits() {
        return loggedUnits;
    }

    public void setLoggedUnits(Double loggedUnits) {
        this.loggedUnits = loggedUnits;
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

    public Double getRevenueNet() {
        return revenueNet;
    }

    public void setRevenueNet(Double revenueNet) {
        this.revenueNet = revenueNet;
    }
}
