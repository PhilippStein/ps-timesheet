package de.phstein.timesheet.service;

import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.ProjectStatsDTO;
import de.phstein.timesheet.model.ProjectTreeDTO;
import de.phstein.timesheet.model.StatsBreakdownRowDTO;
import de.phstein.timesheet.model.TaskStatSummaryDTO;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import de.phstein.timesheet.model.YearNodeDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class TimesheetStatsService {

    @Inject
    TimesheetStorageService storageService;

    public ProjectStatsDTO getProjectStats(ProjectConfig project, Integer year) {
        boolean isPersonDays = CsvPersonDaysHandler.TEMPLATE_NAME.equalsIgnoreCase(
                ProjectConfig.normalizeTemplate(project.getTemplate())
        );

        Double rate = isPersonDays ? project.getDailyRate() : project.getHourlyRate();
        double standardDailyUnits = isPersonDays ? 1.0 : 8.0;

        ProjectStatsDTO stats = new ProjectStatsDTO(project.getName(), project.getTemplate(), year);
        stats.setHourlyRate(project.getHourlyRate());
        stats.setDailyRate(project.getDailyRate());

        Map<String, Double> taskMap = new HashMap<>();

        if (year != null) {
            // Annual statistics for a specific year
            buildYearStats(project, year, isPersonDays, rate, stats, taskMap);
        } else {
            // All-time statistics across all available years
            buildAllTimeStats(project, isPersonDays, rate, stats, taskMap);
        }

        // Finalize utilization & financial metrics
        int actualDays = stats.getActualWorkDays();
        int possibleDays = stats.getPossibleWorkDays();
        double util = possibleDays > 0 ? ((double) actualDays / possibleDays) * 100.0 : 0.0;
        stats.setUtilizationPercent(Math.round(util * 100.0) / 100.0);

        if (rate != null && rate > 0) {
            double actualRev = stats.getTotalLoggedUnits() * rate;
            double maxRev = stats.getPossibleWorkDays() * standardDailyUnits * rate;
            double vacLoss = stats.getVacationDays() * standardDailyUnits * rate;
            double sickLoss = stats.getSickDays() * standardDailyUnits * rate;

            stats.setActualRevenueNet(actualRev);
            stats.setMaxRevenueNet(maxRev);
            stats.setVacationLossNet(vacLoss);
            stats.setSickLossNet(sickLoss);
            stats.setDiffRevenueNet(actualRev - maxRev);
        }

        // Finalize task summaries for PersonDays
        if (isPersonDays && !taskMap.isEmpty()) {
            List<TaskStatSummaryDTO> taskSummaries = taskMap.entrySet().stream()
                    .filter(e -> e.getValue() != null && e.getValue() > 0)
                    .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                    .map(e -> new TaskStatSummaryDTO(e.getKey(), Math.round(e.getValue() * 100.0) / 100.0))
                    .toList();
            stats.setTaskSummaries(taskSummaries);
        }

        return stats;
    }

    private void buildYearStats(ProjectConfig project, int year, boolean isPersonDays, Double rate,
                                ProjectStatsDTO stats, Map<String, Double> taskMap) {
        List<StatsBreakdownRowDTO> rows = new ArrayList<>(12);
        double totalUnits = 0.0;
        int totalActualDays = 0;
        int totalPossibleDays = 0;
        double totalVacation = 0.0;
        double totalSick = 0.0;
        double totalHoliday = 0.0;

        for (int m = 1; m <= 12; m++) {
            TimesheetMonthDTO monthDTO = storageService.loadMonthForStats(project, year, m);
            StatsBreakdownRowDTO row = aggregateMonthData(monthDTO, m, isPersonDays, rate, taskMap);
            rows.add(row);

            totalUnits += row.getLoggedUnits();
            totalActualDays += row.getActualWorkDays();
            totalPossibleDays += row.getPossibleWorkDays();
            totalVacation += row.getVacationDays();
            totalSick += row.getSickDays();
            totalHoliday += row.getHolidayDays();
        }

        stats.setBreakdownRows(rows);
        stats.setTotalLoggedUnits(Math.round(totalUnits * 100.0) / 100.0);
        stats.setActualWorkDays(totalActualDays);
        stats.setPossibleWorkDays(totalPossibleDays);
        stats.setVacationDays(totalVacation);
        stats.setSickDays(totalSick);
        stats.setHolidayDays(totalHoliday);
    }

    private void buildAllTimeStats(ProjectConfig project, boolean isPersonDays, Double rate,
                                   ProjectStatsDTO stats, Map<String, Double> taskMap) {
        ProjectTreeDTO tree = storageService.getProjectTree(project);
        List<YearNodeDTO> years = new ArrayList<>(tree.getYears());
        // Sort chronological ascending (e.g. 2024, 2025, 2026) for the table
        years.sort(Comparator.comparingInt(YearNodeDTO::getYear));

        List<StatsBreakdownRowDTO> rows = new ArrayList<>();
        double totalUnits = 0.0;
        int totalActualDays = 0;
        int totalPossibleDays = 0;
        double totalVacation = 0.0;
        double totalSick = 0.0;
        double totalHoliday = 0.0;

        for (YearNodeDTO yearNode : years) {
            int y = yearNode.getYear();
            StatsBreakdownRowDTO yearRow = new StatsBreakdownRowDTO(String.valueOf(y), y);

            double yearUnits = 0.0;
            int yearActualDays = 0;
            int yearPossibleDays = 0;
            double yearVacation = 0.0;
            double yearSick = 0.0;
            double yearHoliday = 0.0;

            for (int m = 1; m <= 12; m++) {
                TimesheetMonthDTO monthDTO = storageService.loadMonthForStats(project, y, m);
                StatsBreakdownRowDTO mRow = aggregateMonthData(monthDTO, m, isPersonDays, rate, taskMap);

                yearUnits += mRow.getLoggedUnits();
                yearActualDays += mRow.getActualWorkDays();
                yearPossibleDays += mRow.getPossibleWorkDays();
                yearVacation += mRow.getVacationDays();
                yearSick += mRow.getSickDays();
                yearHoliday += mRow.getHolidayDays();
            }

            yearRow.setLoggedUnits(Math.round(yearUnits * 100.0) / 100.0);
            yearRow.setActualWorkDays(yearActualDays);
            yearRow.setPossibleWorkDays(yearPossibleDays);
            yearRow.setVacationDays(yearVacation);
            yearRow.setSickDays(yearSick);
            yearRow.setHolidayDays(yearHoliday);

            if (rate != null && rate > 0) {
                yearRow.setRevenueNet(Math.round(yearUnits * rate * 100.0) / 100.0);
            }

            rows.add(yearRow);

            totalUnits += yearUnits;
            totalActualDays += yearActualDays;
            totalPossibleDays += yearPossibleDays;
            totalVacation += yearVacation;
            totalSick += yearSick;
            totalHoliday += yearHoliday;
        }

        stats.setBreakdownRows(rows);
        stats.setTotalLoggedUnits(Math.round(totalUnits * 100.0) / 100.0);
        stats.setActualWorkDays(totalActualDays);
        stats.setPossibleWorkDays(totalPossibleDays);
        stats.setVacationDays(totalVacation);
        stats.setSickDays(totalSick);
        stats.setHolidayDays(totalHoliday);
    }

    private StatsBreakdownRowDTO aggregateMonthData(TimesheetMonthDTO monthDTO, int month,
                                                    boolean isPersonDays, Double rate,
                                                    Map<String, Double> taskMap) {
        String label = String.format("%02d - %s", month, DateUtils.getGermanMonthName(month));
        StatsBreakdownRowDTO row = new StatsBreakdownRowDTO(label, month);

        double loggedUnits = 0.0;
        int actualDays = 0;
        int possibleDays = 0;
        double vacationDays = 0.0;
        double sickDays = 0.0;
        double holidayDays = 0.0;

        if (monthDTO != null && monthDTO.getDays() != null) {
            for (TimesheetDayDTO day : monthDTO.getDays()) {
                if (day.isVacation()) {
                    vacationDays += 1.0;
                }
                if (day.isSick()) {
                    sickDays += 1.0;
                }
                if (day.isHoliday()) {
                    holidayDays += 1.0;
                }

                if (!day.isWeekendDay() && !day.isHoliday()) {
                    possibleDays++;
                }

                if (isPersonDays) {
                    if (day.getTotalPt() != null && day.getTotalPt() > 0) {
                        actualDays++;
                    }
                    if (day.getTaskAllocations() != null) {
                        for (Map.Entry<String, Double> entry : day.getTaskAllocations().entrySet()) {
                            if (entry.getValue() != null && entry.getValue() > 0) {
                                taskMap.merge(entry.getKey(), entry.getValue(), Double::sum);
                            }
                        }
                    }
                } else {
                    if (day.getNetHours() != null && day.getNetHours() > 0) {
                        actualDays++;
                    }
                }
            }

            if (isPersonDays) {
                loggedUnits = monthDTO.getTotalPt() != null ? monthDTO.getTotalPt() : 0.0;
            } else {
                loggedUnits = monthDTO.getTotalNetHours() != null ? monthDTO.getTotalNetHours() : 0.0;
            }
        }

        row.setLoggedUnits(Math.round(loggedUnits * 100.0) / 100.0);
        row.setActualWorkDays(actualDays);
        row.setPossibleWorkDays(possibleDays);
        row.setVacationDays(vacationDays);
        row.setSickDays(sickDays);
        row.setHolidayDays(holidayDays);

        if (rate != null && rate > 0) {
            row.setRevenueNet(Math.round(loggedUnits * rate * 100.0) / 100.0);
        }

        return row;
    }
}
