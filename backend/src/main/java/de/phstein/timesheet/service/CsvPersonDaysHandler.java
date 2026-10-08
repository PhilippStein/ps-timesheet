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
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class CsvPersonDaysHandler implements TimesheetTemplateHandler {

    public static final String TEMPLATE_NAME = "PersonDays";

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
        List<String> tasks = (defaultTasks != null && !defaultTasks.isEmpty())
                ? new ArrayList<>(defaultTasks)
                : new ArrayList<>(List.of("Aufgabe 1"));
        dto.setTaskColumns(tasks);

        int daysInMonth = DateUtils.getDaysInMonth(year, month);
        List<TimesheetDayDTO> days = new ArrayList<>(daysInMonth);

        for (int day = 1; day <= daysInMonth; day++) {
            LocalDate date = LocalDate.of(year, month, day);
            boolean isWeekend = DateUtils.isWeekend(date);
            TimesheetDayDTO dayDTO = new TimesheetDayDTO(
                    date.format(DateUtils.ISO_DATE_FORMATTER),
                    DateUtils.getGermanDayOfWeek(date),
                    isWeekend
            );
            if (!isWeekend) {
                dayDTO.setLocation("Remote");
            }
            days.add(dayDTO);
        }

        dto.setDays(days);
        calculateMonthTotals(dto);
        return dto;
    }

    @Override
    public TimesheetMonthDTO readMonth(Path csvFile, String projectName, int year, int month) {
        TimesheetMonthDTO monthDTO = createEmptyMonth(projectName, year, month, List.of());
        Map<String, TimesheetDayDTO> dayMap = new LinkedHashMap<>();
        for (TimesheetDayDTO d : monthDTO.getDays()) {
            dayMap.put(d.getDate(), d);
        }

        List<String> dynamicTaskColumns = new ArrayList<>();

        if (Files.exists(csvFile)) {
            try (BufferedReader reader = Files.newBufferedReader(csvFile, StandardCharsets.UTF_8);
                 CSVParser parser = CSV_FORMAT.builder().setHeader().setSkipHeaderRecord(true).build().parse(reader)) {

                List<String> headerNames = parser.getHeaderNames();
                for (String h : headerNames) {
                    if (!"Date".equalsIgnoreCase(h) &&
                            !"DayOfWeek".equalsIgnoreCase(h) &&
                            !"Location".equalsIgnoreCase(h) &&
                            !"Notes".equalsIgnoreCase(h) &&
                            !"Status".equalsIgnoreCase(h)) {
                        dynamicTaskColumns.add(h);
                    }
                }

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

                    Map<String, Double> taskAllocations = new HashMap<>();
                    for (String task : dynamicTaskColumns) {
                        String ptStr = getRecordValue(record, headerMap, task, -1);
                        if (ptStr != null && !ptStr.isBlank()) {
                            try {
                                double pt = Double.parseDouble(ptStr.trim().replace(',', '.'));
                                taskAllocations.put(task, pt);
                            } catch (NumberFormatException ignored) {
                            }
                        }
                    }
                    dayDTO.setTaskAllocations(taskAllocations);

                    String location = getRecordValue(record, headerMap, "Location", -1);

                    dayDTO.setLocation(nullIfBlank(location));

                    String notes = getRecordValue(record, headerMap, "Notes", record.size() - 1);
                    dayDTO.setNotes(nullIfBlank(notes));

                    String status = getRecordValue(record, headerMap, "Status", -1);
                    dayDTO.setStatus(DayStatus.fromValue(status));

                    calculateDayPT(dayDTO);
                }
            } catch (IOException e) {
                throw new RuntimeException("Failed to read timesheet CSV: " + csvFile, e);
            }
        }

        if (!dynamicTaskColumns.isEmpty()) {
            monthDTO.setTaskColumns(dynamicTaskColumns);
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

            List<String> taskColumns = month.getTaskColumns() != null ? month.getTaskColumns() : List.of();

            try (BufferedWriter writer = Files.newBufferedWriter(csvFile, StandardCharsets.UTF_8);
                 CSVPrinter printer = new CSVPrinter(writer, CSV_FORMAT)) {

                List<String> headers = new ArrayList<>();
                headers.add("Date");
                headers.add("DayOfWeek");
                headers.add("Location");
                headers.addAll(taskColumns);
                headers.add("Notes");
                headers.add("Status");

                printer.printRecord(headers);

                for (TimesheetDayDTO day : month.getDays()) {
                    List<String> row = new ArrayList<>();
                    row.add(day.getDate() != null ? day.getDate() : "");
                    row.add(day.getDayOfWeek() != null ? day.getDayOfWeek() : "");
                    row.add(day.getLocation() != null ? day.getLocation() : "");

                    Map<String, Double> alloc = day.getTaskAllocations() != null ? day.getTaskAllocations() : Map.of();
                    for (String task : taskColumns) {
                        Double pt = alloc.get(task);
                        row.add(pt != null ? String.valueOf(pt) : "");
                    }

                    row.add(day.getNotes() != null ? day.getNotes() : "");
                    row.add(day.getStatus() != null ? day.getStatus().getValue() : "");
                    printer.printRecord(row);
                }
                printer.flush();
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to write timesheet CSV: " + csvFile, e);
        }
    }

    public static void calculateDayPT(TimesheetDayDTO day) {
        if (day.getTaskAllocations() == null || day.getTaskAllocations().isEmpty()) {
            day.setTotalPt(0.0);
            return;
        }
        double sum = 0.0;
        for (Double val : day.getTaskAllocations().values()) {
            if (val != null) {
                sum += val;
            }
        }
        day.setTotalPt(Math.round(sum * 100.0) / 100.0);
    }

    public static void calculateMonthTotals(TimesheetMonthDTO month) {
        double monthTotal = 0.0;
        Map<String, Double> taskTotals = new HashMap<>();
        List<String> tasks = month.getTaskColumns() != null ? month.getTaskColumns() : List.of();
        for (String t : tasks) {
            taskTotals.put(t, 0.0);
        }

        for (TimesheetDayDTO day : month.getDays()) {
            calculateDayPT(day);
            if (day.getTotalPt() != null) {
                monthTotal += day.getTotalPt();
            }
            if (day.getTaskAllocations() != null) {
                for (Map.Entry<String, Double> entry : day.getTaskAllocations().entrySet()) {
                    if (entry.getValue() != null) {
                        taskTotals.merge(entry.getKey(), entry.getValue(), (a, b) -> Math.round((a + b) * 100.0) / 100.0);
                    }
                }
            }
        }

        month.setTotalPt(Math.round(monthTotal * 100.0) / 100.0);
        month.setTaskTotals(taskTotals);
    }

    private static String getRecordValue(CSVRecord record, Map<String, Integer> headerMap, String headerName, int fallbackIndex) {
        if (headerMap != null && headerMap.containsKey(headerName)) {
            int idx = headerMap.get(headerName);
            if (idx < record.size()) {
                return record.get(idx);
            }
        }
        if (fallbackIndex >= 0 && fallbackIndex < record.size()) {
            return record.get(fallbackIndex);
        }
        return null;
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
