package de.phstein.timesheet.service;

import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.DayStatus;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;

@ApplicationScoped
public class XlsxExportService {

    private static final DateTimeFormatter DATE_FORMATTER_SHORT = DateTimeFormatter.ofPattern("dd.MM.yyyy", Locale.GERMAN);
    private static final String FONT_NAME = "PT Sans";

    @Inject
    AppConfigService appConfigService;

    @Inject
    TimesheetStorageService storageService;

    public byte[] exportTimesheetXlsx(String projectName, int year, int month) {
        if (month < 1 || month > 12) {
            throw new BadRequestException("Month must be between 1 and 12");
        }

        Optional<ProjectConfig> projectOpt = appConfigService.getProject(projectName);
        if (projectOpt.isEmpty()) {
            throw new NotFoundException("Project not found: " + projectName);
        }

        ProjectConfig projectConfig = projectOpt.get();
        TimesheetMonthDTO monthDTO = storageService.loadOrCreateMonth(projectConfig, year, month);

        return generateXlsx(monthDTO, projectConfig);
    }

    public byte[] generateXlsx(TimesheetMonthDTO monthDTO, ProjectConfig projectConfig) {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            String monthName = Month.of(monthDTO.getMonth()).getDisplayName(TextStyle.FULL, Locale.GERMAN);
            XSSFSheet sheet = workbook.createSheet(monthName + " " + monthDTO.getYear());
            sheet.setDisplayGridlines(true);

            String template = projectConfig != null ? projectConfig.getTemplate() : (monthDTO != null ? monthDTO.getTemplate() : "WorkHours");
            if ("PersonDays".equalsIgnoreCase(template)) {
                renderPersonDays(workbook, sheet, monthDTO, projectConfig);
            } else {
                renderWorkHours(workbook, sheet, monthDTO, projectConfig);
            }

            workbook.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate XLSX document", e);
        }
    }

    private void renderPersonDays(XSSFWorkbook workbook, XSSFSheet sheet, TimesheetMonthDTO monthDTO, ProjectConfig projectConfig) {
        StyleBundle styles = new StyleBundle(workbook);

        String monthName = Month.of(monthDTO.getMonth()).getDisplayName(TextStyle.FULL, Locale.GERMAN);
        List<String> taskColumns = monthDTO.getTaskColumns() != null ? monthDTO.getTaskColumns() : new ArrayList<>();
        int totalCols = 1 + taskColumns.size() + 2; // Datum + Tasks + Tätigkeit + Ort

        int rowIndex = 0;

        // Title row: "Leistungsschein <Monat> <Jahr>"
        Row titleRow = sheet.createRow(rowIndex++);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Leistungsschein " + monthName + " " + monthDTO.getYear());
        titleCell.setCellStyle(styles.titleStyle);

        // Empty row
        rowIndex++;

        // Header Row: Datum | Task 1 | Task 2 | ... | Tätigkeit | Ort
        int headerRowNum = rowIndex++;
        Row headerRow = sheet.createRow(headerRowNum);
        int colIdx = 0;

        createStyledCell(headerRow, colIdx++, "Datum", styles.headerCenterStyle);
        for (String task : taskColumns) {
            createStyledCell(headerRow, colIdx++, task, styles.headerCenterStyle);
        }
        createStyledCell(headerRow, colIdx++, "Tätigkeit", styles.headerCenterStyle);
        createStyledCell(headerRow, colIdx++, "Ort", styles.headerCenterStyle);

        // Data Rows
        Map<String, Double> taskSums = new HashMap<>();
        double totalPtSum = 0.0;

        for (TimesheetDayDTO day : monthDTO.getDays()) {
            Row row = sheet.createRow(rowIndex++);
            int c = 0;

            // Datum
            String dateFormatted = "";
            if (day.getDate() != null && !day.getDate().isBlank()) {
                try {
                    LocalDate ld = LocalDate.parse(day.getDate());
                    String weekday = ld.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.GERMAN);
                    dateFormatted = weekday + ",\n" + ld.format(DATE_FORMATTER_SHORT);
                } catch (Exception ignored) {
                    dateFormatted = day.getDate();
                }
            }
            createStyledCell(row, c++, dateFormatted, styles.bodyWrapRightStyle);

            // Task allocations
            for (String task : taskColumns) {
                Double pt = day.getTaskAllocations() != null ? day.getTaskAllocations().get(task) : null;
                if (pt != null && pt > 0.0) {
                    taskSums.put(task, taskSums.getOrDefault(task, 0.0) + pt);
                    totalPtSum += pt;
                    createStyledCell(row, c++, formatPt(pt), styles.bodyCenterStyle);
                } else {
                    createStyledCell(row, c++, "", styles.bodyCenterStyle);
                }
            }

            // Tätigkeit
            List<String> notesList = day.getNotesList();
            StringBuilder sb = new StringBuilder();
            if (notesList != null && !notesList.isEmpty()) {
                for (int i = 0; i < notesList.size(); i++) {
                    sb.append("• ").append(notesList.get(i));
                    if (i < notesList.size() - 1) {
                        sb.append("\n");
                    }
                }
            }
            createStyledCell(row, c++, sb.toString(), styles.bodyWrapLeftStyle);

            // Ort
            String loc = day.getLocation();
            if ((loc == null || loc.isBlank()) && day.getStatus() != null) {
                loc = day.getStatus().getDisplayName();
            }
            createStyledCell(row, c++, loc != null ? loc : "", styles.bodyLeftStyle);
        }

        // Sum row: Task column sums
        Row sumRow = sheet.createRow(rowIndex++);
        int sumColIdx = 0;
        createStyledCell(sumRow, sumColIdx++, "Summe", styles.headerLeftStyle);
        for (String task : taskColumns) {
            Double sum = taskSums.get(task);
            createStyledCell(sumRow, sumColIdx++, sum != null && sum > 0.0 ? formatPt(sum) : "", styles.headerCenterStyle);
        }
        createStyledCell(sumRow, sumColIdx++, "", styles.headerLeftStyle);
        createStyledCell(sumRow, sumColIdx++, "", styles.headerLeftStyle);

        // Total PT row: Gesamtzahl PT
        int totalRowNum = rowIndex++;
        Row totalRow = sheet.createRow(totalRowNum);

        createStyledCell(totalRow, 0, "Gesamtzahl PT", styles.headerLeftStyle);
        createStyledCell(totalRow, 1, "", styles.headerLeftStyle);
        sheet.addMergedRegion(new CellRangeAddress(totalRowNum, totalRowNum, 0, 1));

        createStyledCell(totalRow, 2, formatPt(totalPtSum), styles.headerLeftStyle);
        for (int i = 3; i < totalCols; i++) {
            createStyledCell(totalRow, i, "", styles.headerLeftStyle);
        }
        if (totalCols > 3) {
            sheet.addMergedRegion(new CellRangeAddress(totalRowNum, totalRowNum, 2, totalCols - 1));
        }

        // Optional project footer text
        if (projectConfig != null && projectConfig.getPdfFooterText() != null && !projectConfig.getPdfFooterText().isBlank()) {
            rowIndex++;
            String[] lines = projectConfig.getPdfFooterText().split("\n");
            for (String line : lines) {
                Row fRow = sheet.createRow(rowIndex++);
                Cell fCell = fRow.createCell(0);
                fCell.setCellValue(line);
                fCell.setCellStyle(styles.plainTextStyle);
            }
        }

        // Column widths
        for (int i = 0; i < totalCols; i++) {
            sheet.autoSizeColumn(i);
        }
        // Ensure sensible minimum widths
        sheet.setColumnWidth(0, Math.max(sheet.getColumnWidth(0), 18 * 256));
        for (int i = 0; i < taskColumns.size(); i++) {
            sheet.setColumnWidth(1 + i, Math.max(sheet.getColumnWidth(1 + i), 10 * 256));
        }
        int taetigkeitCol = 1 + taskColumns.size();
        sheet.setColumnWidth(taetigkeitCol, Math.max(sheet.getColumnWidth(taetigkeitCol), 40 * 256));
        sheet.setColumnWidth(taetigkeitCol + 1, Math.max(sheet.getColumnWidth(taetigkeitCol + 1), 14 * 256));
    }

    private void renderWorkHours(XSSFWorkbook workbook, XSSFSheet sheet, TimesheetMonthDTO monthDTO, ProjectConfig projectConfig) {
        StyleBundle styles = new StyleBundle(workbook);

        String monthName = Month.of(monthDTO.getMonth()).getDisplayName(TextStyle.FULL, Locale.GERMAN);
        String yearStr = String.valueOf(monthDTO.getYear());
        String headerTitle = (projectConfig != null && projectConfig.getPdfHeaderTitle() != null && !projectConfig.getPdfHeaderTitle().isBlank())
                ? projectConfig.getPdfHeaderTitle()
                : (projectConfig != null && projectConfig.getName() != null ? projectConfig.getName() : monthDTO.getProjectName());

        YearMonth ym = YearMonth.of(monthDTO.getYear(), monthDTO.getMonth());
        LocalDate monthEnd = ym.atEndOfMonth();
        String monthEndStr = monthEnd.format(DATE_FORMATTER_SHORT);

        int rowIndex = 0;

        // Header Row 1: <Monat> | <Jahr> | <Header-Text> (span 3) | <Monatsende>
        int h1RowNum = rowIndex++;
        Row h1 = sheet.createRow(h1RowNum);
        createStyledCell(h1, 0, monthName, styles.headerLeftStyle);
        createStyledCell(h1, 1, yearStr, styles.headerCenterStyle);
        createStyledCell(h1, 2, headerTitle, styles.headerCenterStyle);
        createStyledCell(h1, 3, "", styles.headerCenterStyle);
        createStyledCell(h1, 4, "", styles.headerCenterStyle);
        createStyledCell(h1, 5, monthEndStr, styles.headerRightStyle);
        sheet.addMergedRegion(new CellRangeAddress(h1RowNum, h1RowNum, 2, 4));

        // Header Row 2: Datum | Start | Ende | Pause | Summe | Bemerkung
        Row h2 = sheet.createRow(rowIndex++);
        createStyledCell(h2, 0, "Datum", styles.headerLeftStyle);
        createStyledCell(h2, 1, "Start", styles.headerCenterStyle);
        createStyledCell(h2, 2, "Ende", styles.headerCenterStyle);
        createStyledCell(h2, 3, "Pause", styles.headerCenterStyle);
        createStyledCell(h2, 4, "Summe", styles.headerRightStyle);
        createStyledCell(h2, 5, "Bemerkung", styles.headerLeftStyle);

        List<TimesheetDayDTO> days = monthDTO.getDays();
        double currentWeekNetHours = 0.0;
        double totalMonthlyNetHours = 0.0;
        int vacationDays = 0;

        for (int i = 0; i < days.size(); i++) {
            TimesheetDayDTO day = days.get(i);
            LocalDate ld = null;
            if (day.getDate() != null && !day.getDate().isBlank()) {
                try {
                    ld = LocalDate.parse(day.getDate());
                } catch (Exception ignored) {
                }
            }

            boolean isWeekend = day.isWeekend() || (ld != null && (ld.getDayOfWeek() == DayOfWeek.SATURDAY || ld.getDayOfWeek() == DayOfWeek.SUNDAY));
            boolean isFilled = (day.getStartTime() != null && !day.getStartTime().isBlank())
                    || (day.getEndTime() != null && !day.getEndTime().isBlank())
                    || (day.getComment() != null && !day.getComment().isBlank())
                    || (day.getStatus() != null)
                    || (day.getNetHours() != null && day.getNetHours() > 0.0);

            if (day.getStatus() == DayStatus.URLAUB || (day.getStatus() != null && "URLAUB".equalsIgnoreCase(day.getStatus().name()))) {
                vacationDays++;
            }

            Double netHours = day.getNetHours();
            if (netHours != null) {
                currentWeekNetHours += netHours;
                totalMonthlyNetHours += netHours;
            }

            if (!isWeekend || isFilled) {
                Row row = sheet.createRow(rowIndex++);

                String dateStr = ld != null ? ld.format(DATE_FORMATTER_SHORT) : (day.getDate() != null ? day.getDate() : "");
                String startStr = day.getStartTime() != null ? day.getStartTime() : "";
                String endStr = day.getEndTime() != null ? day.getEndTime() : "";
                String pauseStr = day.getPauseMinutes() != null && day.getPauseMinutes() > 0 ? formatMinutesToHhMm(day.getPauseMinutes()) : "";
                String sumStr = netHours != null && netHours > 0.0 ? formatHoursToHhMm(netHours) : "";

                String comment = day.getComment();
                if ((comment == null || comment.isBlank()) && day.getStatus() != null) {
                    comment = day.getStatus().getDisplayName();
                }

                createStyledCell(row, 0, dateStr, styles.bodyLeftStyle);
                createStyledCell(row, 1, startStr, styles.bodyCenterStyle);
                createStyledCell(row, 2, endStr, styles.bodyCenterStyle);
                createStyledCell(row, 3, pauseStr, styles.bodyCenterStyle);
                createStyledCell(row, 4, sumStr, styles.bodyRightStyle);
                createStyledCell(row, 5, comment != null ? comment : "", styles.bodyLeftStyle);
            }

            boolean isSunday = ld != null && ld.getDayOfWeek() == DayOfWeek.SUNDAY;
            boolean isLastDay = (i == days.size() - 1);

            if (isSunday || isLastDay) {
                Row weekSumRow = sheet.createRow(rowIndex++);
                createStyledCell(weekSumRow, 0, "Summe", styles.headerLeftStyle);
                createStyledCell(weekSumRow, 1, "", styles.headerCenterStyle);
                createStyledCell(weekSumRow, 2, "", styles.headerCenterStyle);
                createStyledCell(weekSumRow, 3, "", styles.headerCenterStyle);
                createStyledCell(weekSumRow, 4, formatHoursToHhMm(currentWeekNetHours), styles.headerRightStyle);
                createStyledCell(weekSumRow, 5, "", styles.headerLeftStyle);

                currentWeekNetHours = 0.0;
            }
        }

        // Monthly Sum Row
        int monthSumRowNum = rowIndex++;
        Row monthSumRow = sheet.createRow(monthSumRowNum);
        createStyledCell(monthSumRow, 0, "Monatssumme", styles.headerLeftStyle);
        createStyledCell(monthSumRow, 1, "", styles.headerLeftStyle);
        createStyledCell(monthSumRow, 2, "", styles.headerLeftStyle);
        createStyledCell(monthSumRow, 3, "", styles.headerLeftStyle);
        sheet.addMergedRegion(new CellRangeAddress(monthSumRowNum, monthSumRowNum, 0, 3));

        createStyledCell(monthSumRow, 4, formatHoursToHhMm(totalMonthlyNetHours), styles.headerRightStyle);
        createStyledCell(monthSumRow, 5, "", styles.headerLeftStyle);

        // Statistics Summary Table
        int workingDays = monthDTO.getWorkingDays() != null ? monthDTO.getWorkingDays() : monthDTO.calculateWorkingDays();
        double targetHours = workingDays * 8.0;
        double diffHours = totalMonthlyNetHours - targetHours;

        rowIndex++; // Empty row

        addStatRow(sheet.createRow(rowIndex++), "Arbeitstage", String.valueOf(workingDays), styles);
        addStatRow(sheet.createRow(rowIndex++), "Sollstunden", String.format(Locale.US, "%.2f", targetHours), styles);
        addStatRow(sheet.createRow(rowIndex++), "Ist-Stunden", String.format(Locale.US, "%.2f", totalMonthlyNetHours), styles);
        addStatRow(sheet.createRow(rowIndex++), "Differenz", String.format(Locale.US, "%.2f", diffHours), styles);
        addStatRow(sheet.createRow(rowIndex++), "Urlaub", String.format(Locale.US, "%.1f", (double) vacationDays), styles);

        // Optional project footer text
        if (projectConfig != null && projectConfig.getPdfFooterText() != null && !projectConfig.getPdfFooterText().isBlank()) {
            rowIndex++;
            String[] lines = projectConfig.getPdfFooterText().split("\n");
            for (String line : lines) {
                Row fRow = sheet.createRow(rowIndex++);
                Cell fCell = fRow.createCell(0);
                fCell.setCellValue(line);
                fCell.setCellStyle(styles.plainTextStyle);
            }
        }

        // Column widths
        for (int i = 0; i < 6; i++) {
            sheet.autoSizeColumn(i);
        }
        sheet.setColumnWidth(0, Math.max(sheet.getColumnWidth(0), 14 * 256));
        sheet.setColumnWidth(1, Math.max(sheet.getColumnWidth(1), 10 * 256));
        sheet.setColumnWidth(2, Math.max(sheet.getColumnWidth(2), 10 * 256));
        sheet.setColumnWidth(3, Math.max(sheet.getColumnWidth(3), 10 * 256));
        sheet.setColumnWidth(4, Math.max(sheet.getColumnWidth(4), 12 * 256));
        sheet.setColumnWidth(5, Math.max(sheet.getColumnWidth(5), 35 * 256));
    }

    private void addStatRow(Row row, String label, String value, StyleBundle styles) {
        createStyledCell(row, 0, label, styles.statLabelStyle);
        createStyledCell(row, 1, value, styles.statValueStyle);
    }

    private void createStyledCell(Row row, int col, String value, XSSFCellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    private static class StyleBundle {
        final XSSFCellStyle headerLeftStyle;
        final XSSFCellStyle headerCenterStyle;
        final XSSFCellStyle headerRightStyle;
        final XSSFCellStyle bodyLeftStyle;
        final XSSFCellStyle bodyCenterStyle;
        final XSSFCellStyle bodyRightStyle;
        final XSSFCellStyle bodyWrapLeftStyle;
        final XSSFCellStyle bodyWrapRightStyle;
        final XSSFCellStyle statLabelStyle;
        final XSSFCellStyle statValueStyle;
        final XSSFCellStyle titleStyle;
        final XSSFCellStyle plainTextStyle;

        StyleBundle(XSSFWorkbook wb) {
            XSSFFont regularFont = wb.createFont();
            regularFont.setFontName(FONT_NAME);
            regularFont.setFontHeightInPoints((short) 10);

            XSSFFont boldFont = wb.createFont();
            boldFont.setFontName(FONT_NAME);
            boldFont.setFontHeightInPoints((short) 10);
            boldFont.setBold(true);

            XSSFFont titleFont = wb.createFont();
            titleFont.setFontName(FONT_NAME);
            titleFont.setFontHeightInPoints((short) 12);
            titleFont.setBold(true);

            XSSFColor grayBg = new XSSFColor(new java.awt.Color(238, 238, 238), null);

            titleStyle = wb.createCellStyle();
            titleStyle.setFont(titleFont);

            plainTextStyle = wb.createCellStyle();
            plainTextStyle.setFont(regularFont);

            // Headers
            headerLeftStyle = createBorderedStyle(wb, boldFont, grayBg, HorizontalAlignment.LEFT, false);
            headerCenterStyle = createBorderedStyle(wb, boldFont, grayBg, HorizontalAlignment.CENTER, false);
            headerRightStyle = createBorderedStyle(wb, boldFont, grayBg, HorizontalAlignment.RIGHT, false);

            // Body
            bodyLeftStyle = createBorderedStyle(wb, regularFont, null, HorizontalAlignment.LEFT, false);
            bodyCenterStyle = createBorderedStyle(wb, regularFont, null, HorizontalAlignment.CENTER, false);
            bodyRightStyle = createBorderedStyle(wb, regularFont, null, HorizontalAlignment.RIGHT, false);
            bodyWrapLeftStyle = createBorderedStyle(wb, regularFont, null, HorizontalAlignment.LEFT, true);
            bodyWrapRightStyle = createBorderedStyle(wb, regularFont, null, HorizontalAlignment.RIGHT, true);

            // Stats
            statLabelStyle = createBorderedStyle(wb, boldFont, null, HorizontalAlignment.LEFT, false);
            statValueStyle = createBorderedStyle(wb, regularFont, null, HorizontalAlignment.RIGHT, false);
        }

        private XSSFCellStyle createBorderedStyle(XSSFWorkbook wb, XSSFFont font, XSSFColor bg, HorizontalAlignment align, boolean wrap) {
            XSSFCellStyle style = wb.createCellStyle();
            style.setFont(font);
            style.setAlignment(align);
            style.setVerticalAlignment(VerticalAlignment.CENTER);
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            if (bg != null) {
                style.setFillForegroundColor(bg);
                style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            }
            if (wrap) {
                style.setWrapText(true);
            }
            return style;
        }
    }

    public static String formatPt(Double val) {
        if (val == null || val == 0.0) {
            return "0";
        }
        if (val == Math.floor(val)) {
            return String.format(Locale.US, "%.0f", val);
        }
        return BigDecimal.valueOf(val).stripTrailingZeros().toPlainString();
    }

    public static String formatHoursToHhMm(Double hours) {
        if (hours == null || hours == 0.0) {
            return "00:00";
        }
        long totalMinutes = Math.round(hours * 60);
        long h = totalMinutes / 60;
        long m = Math.abs(totalMinutes % 60);
        return String.format("%02d:%02d", h, m);
    }

    public static String formatMinutesToHhMm(Integer minutes) {
        if (minutes == null || minutes == 0) {
            return "00:00";
        }
        long h = minutes / 60;
        long m = Math.abs(minutes % 60);
        return String.format("%02d:%02d", h, m);
    }
}
