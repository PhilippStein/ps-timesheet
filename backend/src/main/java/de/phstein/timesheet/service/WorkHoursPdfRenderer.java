package de.phstein.timesheet.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.DayStatus;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.awt.Color;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

@ApplicationScoped
public class WorkHoursPdfRenderer {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy", Locale.GERMAN);
    private static final Color HEADER_BG_COLOR = new Color(238, 238, 238); // #EEEEEE
    private static final Color GRID_COLOR = new Color(100, 100, 100);

    @Inject
    PdfFontService pdfFontService;

    public void render(Document document, TimesheetMonthDTO monthDTO, ProjectConfig projectConfig) throws Exception {
        Font fontRegular = pdfFontService.getRegularFont(11f);
        Font fontBold = pdfFontService.getBoldFont(11f);

        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100f);
        table.setHeaderRows(2);
        // Column widths: Datum, Start, Ende, Pause, Summe, Bemerkung
        table.setWidths(new float[]{18f, 12f, 12f, 12f, 14f, 32f});

        String monthName = Month.of(monthDTO.getMonth()).getDisplayName(TextStyle.FULL, Locale.GERMAN);
        String yearStr = String.valueOf(monthDTO.getYear());
        String headerTitle = (projectConfig != null && projectConfig.getPdfHeaderTitle() != null && !projectConfig.getPdfHeaderTitle().isBlank())
                ? projectConfig.getPdfHeaderTitle()
                : (projectConfig != null && projectConfig.getName() != null ? projectConfig.getName() : monthDTO.getProjectName());

        YearMonth ym = YearMonth.of(monthDTO.getYear(), monthDTO.getMonth());
        LocalDate monthEnd = ym.atEndOfMonth();
        String monthEndStr = monthEnd.format(DATE_FORMATTER);

        // Header Row 1: <Monat> | <Jahr> | <Header-Text> (colspan 3) | <Monatsende> (colspan 1)
        table.addCell(createCell(monthName, fontBold, Element.ALIGN_LEFT, HEADER_BG_COLOR, 1));
        table.addCell(createCell(yearStr, fontBold, Element.ALIGN_CENTER, HEADER_BG_COLOR, 1));
        table.addCell(createCell(headerTitle, fontBold, Element.ALIGN_CENTER, HEADER_BG_COLOR, 3));
        table.addCell(createCell(monthEndStr, fontBold, Element.ALIGN_RIGHT, HEADER_BG_COLOR, 1));

        // Header Row 2: Datum | Start | Ende | Pause | Summe | Bemerkung
        table.addCell(createCell("Datum", fontBold, Element.ALIGN_LEFT, HEADER_BG_COLOR, 1));
        table.addCell(createCell("Start", fontBold, Element.ALIGN_CENTER, HEADER_BG_COLOR, 1));
        table.addCell(createCell("Ende", fontBold, Element.ALIGN_CENTER, HEADER_BG_COLOR, 1));
        table.addCell(createCell("Pause", fontBold, Element.ALIGN_CENTER, HEADER_BG_COLOR, 1));
        table.addCell(createCell("Summe", fontBold, Element.ALIGN_RIGHT, HEADER_BG_COLOR, 1));
        table.addCell(createCell("Bemerkung", fontBold, Element.ALIGN_LEFT, HEADER_BG_COLOR, 1));

        // Data Rows & Weekly Sums
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

            // Only output row if not (isWeekend && !isFilled)
            if (!isWeekend || isFilled) {
                String dateStr = ld != null ? ld.format(DATE_FORMATTER) : (day.getDate() != null ? day.getDate() : "");
                String startStr = day.getStartTime() != null ? day.getStartTime() : "";
                String endStr = day.getEndTime() != null ? day.getEndTime() : "";
                String pauseStr = day.getPauseMinutes() != null && day.getPauseMinutes() > 0 ? formatMinutesToHhMm(day.getPauseMinutes()) : "";
                String sumStr = netHours != null && netHours > 0.0 ? formatHoursToHhMm(netHours) : "";

                String comment = day.getComment();
                if ((comment == null || comment.isBlank()) && day.getStatus() != null) {
                    comment = day.getStatus().getDisplayName();
                }

                table.addCell(createCell(dateStr, fontRegular, Element.ALIGN_LEFT, null, 1));
                table.addCell(createCell(startStr, fontRegular, Element.ALIGN_CENTER, null, 1));
                table.addCell(createCell(endStr, fontRegular, Element.ALIGN_CENTER, null, 1));
                table.addCell(createCell(pauseStr, fontRegular, Element.ALIGN_CENTER, null, 1));
                table.addCell(createCell(sumStr, fontRegular, Element.ALIGN_RIGHT, null, 1));
                table.addCell(createCell(comment != null ? comment : "", fontRegular, Element.ALIGN_LEFT, null, 1));
            }

            // Check if week ends (Sunday or last day of month)
            boolean isSunday = ld != null && ld.getDayOfWeek() == DayOfWeek.SUNDAY;
            boolean isLastDay = (i == days.size() - 1);

            if (isSunday || isLastDay) {
                // Emit weekly sum row
                table.addCell(createCell("Summe", fontBold, Element.ALIGN_LEFT, HEADER_BG_COLOR, 1));
                table.addCell(createCell("", fontBold, Element.ALIGN_CENTER, HEADER_BG_COLOR, 1));
                table.addCell(createCell("", fontBold, Element.ALIGN_CENTER, HEADER_BG_COLOR, 1));
                table.addCell(createCell("", fontBold, Element.ALIGN_CENTER, HEADER_BG_COLOR, 1));
                table.addCell(createCell(formatHoursToHhMm(currentWeekNetHours), fontBold, Element.ALIGN_RIGHT, HEADER_BG_COLOR, 1));
                table.addCell(createCell("", fontBold, Element.ALIGN_LEFT, HEADER_BG_COLOR, 1));

                currentWeekNetHours = 0.0;
            }
        }

        // Monthly Sum Row: Monatssumme (colspan 4) | total (Summe) | empty (Bemerkung)
        table.addCell(createCell("Monatssumme", fontBold, Element.ALIGN_LEFT, HEADER_BG_COLOR, 4));
        table.addCell(createCell(formatHoursToHhMm(totalMonthlyNetHours), fontBold, Element.ALIGN_RIGHT, HEADER_BG_COLOR, 1));
        table.addCell(createCell("", fontBold, Element.ALIGN_LEFT, HEADER_BG_COLOR, 1));

        document.add(table);

        // Statistics Summary Table
        int workingDays = monthDTO.getWorkingDays() != null ? monthDTO.getWorkingDays() : monthDTO.calculateWorkingDays();
        double targetHours = workingDays * 8.0;
        double diffHours = totalMonthlyNetHours - targetHours;

        Font fontStat = pdfFontService.getRegularFont(10f);

        PdfPTable statTable = new PdfPTable(2);
        statTable.setHorizontalAlignment(Element.ALIGN_LEFT);
        statTable.setWidthPercentage(45f);
        statTable.setWidths(new float[]{55f, 45f});
        statTable.setSpacingBefore(10f);

        statTable.addCell(createStatCell("Arbeitstage", fontStat, Element.ALIGN_LEFT));
        statTable.addCell(createStatCell(String.valueOf(workingDays), fontStat, Element.ALIGN_RIGHT));

        statTable.addCell(createStatCell("Sollstunden", fontStat, Element.ALIGN_LEFT));
        statTable.addCell(createStatCell(String.format(Locale.US, "%.2f", targetHours), fontStat, Element.ALIGN_RIGHT));

        statTable.addCell(createStatCell("Ist-Stunden", fontStat, Element.ALIGN_LEFT));
        statTable.addCell(createStatCell(String.format(Locale.US, "%.2f", totalMonthlyNetHours), fontStat, Element.ALIGN_RIGHT));

        statTable.addCell(createStatCell("Differenz", fontStat, Element.ALIGN_LEFT));
        statTable.addCell(createStatCell(String.format(Locale.US, "%.2f", diffHours), fontStat, Element.ALIGN_RIGHT));

        statTable.addCell(createStatCell("Urlaub", fontStat, Element.ALIGN_LEFT));
        statTable.addCell(createStatCell(String.format(Locale.US, "%.1f", (double) vacationDays), fontStat, Element.ALIGN_RIGHT));

        document.add(statTable);

        // Optional project footer text
        if (projectConfig != null && projectConfig.getPdfFooterText() != null && !projectConfig.getPdfFooterText().isBlank()) {
            Paragraph footer = new Paragraph(projectConfig.getPdfFooterText(), fontRegular);
            footer.setSpacingBefore(15f);
            document.add(footer);
        }
    }

    private PdfPCell createCell(String text, Font font, int alignment, Color bgColor, int colSpan) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(4f);
        cell.setHorizontalAlignment(alignment);
        cell.setBorderColor(GRID_COLOR);
        if (bgColor != null) {
            cell.setBackgroundColor(bgColor);
        }
        if (colSpan > 1) {
            cell.setColspan(colSpan);
        }
        return cell;
    }

    private PdfPCell createStatCell(String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(2f);
        cell.setHorizontalAlignment(alignment);
        cell.setBorderColor(GRID_COLOR);
        return cell;
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
        int h = minutes / 60;
        int m = Math.abs(minutes % 60);
        return String.format("%02d:%02d", h, m);
    }
}
