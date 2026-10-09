package de.phstein.timesheet.service;

import de.phstein.timesheet.model.DayStatus;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import jakarta.enterprise.context.ApplicationScoped;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class CsvWorkHoursHandler implements TimesheetTemplateHandler {

    public static final String TEMPLATE_NAME = "WorkHours";

    private static final CSVFormat CSV_FORMAT = CSVFormat.DEFAULT.builder()
            .setDelimiter(';')
            .setTrim(true)
            .setIgnoreEmptyLines(true)
            .build();

    @Override
    public String getTemplateName() {
        return TEMPLATE_NAME;
    }

    @Override
    public TimesheetMonthDTO createEmptyMonth(String projectName, int year, int month, List<String> defaultTasks) {
        TimesheetMonthDTO dto = new TimesheetMonthDTO(projectName, year, month, TEMPLATE_NAME);
        int daysInMonth = DateUtils.getDaysInMonth(year, month);
        List<TimesheetDayDTO> days = new ArrayList<>(daysInMonth);

        for (int day = 1; day <= daysInMonth; day++) {
            LocalDate date = LocalDate.of(year, month, day);
            TimesheetDayDTO dayDTO = new TimesheetDayDTO(
                    date.format(DateUtils.ISO_DATE_FORMATTER),
                    DateUtils.getGermanDayOfWeek(date),
                    DateUtils.isWeekend(date)
            );
            days.add(dayDTO);
        }

        dto.setDays(days);
        dto.setTotalNetHours(0.0);
        return dto;
    }

    @Override
    public TimesheetMonthDTO readMonth(Path csvFile, String projectName, int year, int month) {
        TimesheetMonthDTO monthDTO = createEmptyMonth(projectName, year, month, List.of());
        Map<String, TimesheetDayDTO> dayMap = new LinkedHashMap<>();
        for (TimesheetDayDTO d : monthDTO.getDays()) {
            dayMap.put(d.getDate(), d);
        }

        if (Files.exists(csvFile)) {
            try (BufferedReader reader = Files.newBufferedReader(csvFile, StandardCharsets.UTF_8);
                 CSVParser parser = CSV_FORMAT.builder().setHeader().setSkipHeaderRecord(true).build().parse(reader)) {

                Map<String, Integer> headerMap = parser.getHeaderMap();

                for (CSVRecord record : parser) {
                    if (record.size() == 0) continue;
                    String dateStr = getRecordValue(record, headerMap, "Date", 0);
                    if (dateStr == null || dateStr.isBlank()) continue;

                    TimesheetDayDTO dayDTO = dayMap.get(dateStr);
                    if (dayDTO == null) {
                        try {
                            LocalDate parsedDate = LocalDate.parse(dateStr, DateUtils.ISO_DATE_FORMATTER);
                            dayDTO = new TimesheetDayDTO(dateStr, DateUtils.getGermanDayOfWeek(parsedDate), DateUtils.isWeekend(parsedDate));
                            dayMap.put(dateStr, dayDTO);
                        } catch (Exception ignored) {
                            continue;
                        }
                    }

                    String startTime = getRecordValue(record, headerMap, "StartTime", 2);
                    String endTime = getRecordValue(record, headerMap, "EndTime", 3);
                    String pauseStr = getRecordValue(record, headerMap, "PauseMinutes", 4);
                    String comment = getRecordValue(record, headerMap, "Comment", 5);
                    String status = getRecordValue(record, headerMap, "Status", 6);

                    dayDTO.setStartTime(nullIfBlank(startTime));
                    dayDTO.setEndTime(nullIfBlank(endTime));
                    if (pauseStr != null && !pauseStr.isBlank()) {
                        try {
                            dayDTO.setPauseMinutes(Integer.parseInt(pauseStr.trim()));
                        } catch (NumberFormatException ignored) {
                        }
                    }
                    dayDTO.setComment(nullIfBlank(comment));
                    dayDTO.setStatus(DayStatus.fromValue(status));

                    calculateNetHours(dayDTO);
                }
            } catch (IOException e) {
                throw new RuntimeException("Failed to read timesheet CSV: " + csvFile, e);
            }
        }

        List<TimesheetDayDTO> resultDays = new ArrayList<>(dayMap.values());
        monthDTO.setDays(resultDays);
        calculateMonthTotals(monthDTO);
        return monthDTO;
    }

    @Override
    public void writeMonth(Path csvFile, TimesheetMonthDTO month) {
        try {
            if (csvFile.getParent() != null) {
                Files.createDirectories(csvFile.getParent());
            }

            try (BufferedWriter writer = Files.newBufferedWriter(csvFile, StandardCharsets.UTF_8);
                 CSVPrinter printer = new CSVPrinter(writer, CSV_FORMAT)) {

                printer.printRecord("Date", "DayOfWeek", "StartTime", "EndTime", "PauseMinutes", "Comment", "Status");

                for (TimesheetDayDTO day : month.getDays()) {
                    printer.printRecord(
                            day.getDate() != null ? day.getDate() : "",
                            day.getDayOfWeek() != null ? day.getDayOfWeek() : "",
                            day.getStartTime() != null ? day.getStartTime() : "",
                            day.getEndTime() != null ? day.getEndTime() : "",
                            day.getPauseMinutes() != null ? String.valueOf(day.getPauseMinutes()) : "",
                            day.getComment() != null ? day.getComment() : "",
                            day.getStatus() != null ? day.getStatus().getValue() : ""
                    );
                }
                printer.flush();
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to write timesheet CSV: " + csvFile, e);
        }
    }

    public static void calculateNetHours(TimesheetDayDTO day) {
        if (day.getStartTime() == null || day.getStartTime().isBlank() ||
                day.getEndTime() == null || day.getEndTime().isBlank()) {
            day.setNetHours(null);
            return;
        }

        try {
            int startMinutes = parseTimeToMinutes(day.getStartTime());
            int endMinutes = parseTimeToMinutes(day.getEndTime());
            int pause = day.getPauseMinutes() != null ? day.getPauseMinutes() : 0;

            int netMinutes = (endMinutes - startMinutes) - pause;
            if (netMinutes < 0) {
                netMinutes = 0;
            }
            double hours = Math.round((netMinutes / 60.0) * 100.0) / 100.0;
            day.setNetHours(hours);
        } catch (Exception e) {
            day.setNetHours(null);
        }
    }

    public static void calculateMonthTotals(TimesheetMonthDTO month) {
        double total = 0.0;
        for (TimesheetDayDTO day : month.getDays()) {
            calculateNetHours(day);
            if (day.getNetHours() != null) {
                total += day.getNetHours();
            }
        }
        month.setTotalNetHours(Math.round(total * 100.0) / 100.0);
        month.setWorkingDays(month.calculateWorkingDays());
    }

    private static int parseTimeToMinutes(String timeStr) {
        String[] parts = timeStr.trim().split(":");
        int hours = Integer.parseInt(parts[0].trim());
        int minutes = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : 0;
        return hours * 60 + minutes;
    }

    private static String getRecordValue(CSVRecord record, Map<String, Integer> headerMap, String headerName, int fallbackIndex) {
        if (headerMap != null && headerMap.containsKey(headerName)) {
            int idx = headerMap.get(headerName);
            if (idx >= 0 && idx < record.size()) {
                return record.get(idx);
            }
        }
        if (fallbackIndex >= 0 && fallbackIndex < record.size()) {
            return record.get(fallbackIndex);
        }
        return null;
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
