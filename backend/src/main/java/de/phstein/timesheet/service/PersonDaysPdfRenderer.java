package de.phstein.timesheet.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.awt.Color;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class PersonDaysPdfRenderer {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE,\ndd.MM.yyyy", Locale.GERMAN);

    @Inject
    PdfFontService pdfFontService;

    public void render(Document document, TimesheetMonthDTO monthDTO, ProjectConfig projectConfig) throws Exception {
        Font fontRegular = pdfFontService.getRegularFont(11f);
        Font fontBold = pdfFontService.getBoldFont(11f);

        // Header / Title: "Leistungsschein <Monat> <Jahr>" in 11pt Bold
        String monthName = Month.of(monthDTO.getMonth()).getDisplayName(TextStyle.FULL, Locale.GERMAN);
        Paragraph title = new Paragraph("Leistungsschein " + monthName + " " + monthDTO.getYear(), fontBold);
        title.setSpacingAfter(10f);
        document.add(title);

        List<String> taskColumns = monthDTO.getTaskColumns() != null ? monthDTO.getTaskColumns() : new ArrayList<>();
        int totalCols = 1 + taskColumns.size() + 2; // Datum + Tasks + Tätigkeit + Ort

        PdfPTable table = new PdfPTable(totalCols);
        table.setWidthPercentage(100f);
        table.setHeaderRows(1);

        // Calculate relative widths
        float[] widths = new float[totalCols];
        widths[0] = 22f; // Datum
        for (int i = 0; i < taskColumns.size(); i++) {
            widths[1 + i] = 12f; // Each task
        }
        widths[1 + taskColumns.size()] = 38f; // Tätigkeit
        widths[2 + taskColumns.size()] = 16f; // Ort
        table.setWidths(widths);

        // Header cells
        table.addCell(createHeaderCell("Datum", fontBold, Element.ALIGN_LEFT));
        for (String task : taskColumns) {
            table.addCell(createHeaderCell(task, fontBold, Element.ALIGN_RIGHT));
        }
        table.addCell(createHeaderCell("Tätigkeit", fontBold, Element.ALIGN_LEFT));
        table.addCell(createHeaderCell("Ort", fontBold, Element.ALIGN_LEFT));

        // Rows
        Map<String, Double> taskSums = new HashMap<>();
        double totalPtSum = 0.0;

        for (TimesheetDayDTO day : monthDTO.getDays()) {
            // Datum: "Montag,\n05.10.2026"
            String dateStr = day.getDate();
            if (dateStr != null && !dateStr.isBlank()) {
                try {
                    LocalDate ld = LocalDate.parse(dateStr);
                    dateStr = ld.format(DATE_FORMATTER);
                } catch (Exception ignored) {
                }
            } else {
                dateStr = "";
            }
            table.addCell(createBodyCell(dateStr, fontRegular, Element.ALIGN_LEFT));

            // Task allocations
            for (String task : taskColumns) {
                Double pt = day.getTaskAllocations() != null ? day.getTaskAllocations().get(task) : null;
                if (pt != null && pt > 0.0) {
                    taskSums.put(task, taskSums.getOrDefault(task, 0.0) + pt);
                    totalPtSum += pt;
                    table.addCell(createBodyCell(formatPt(pt), fontRegular, Element.ALIGN_RIGHT));
                } else {
                    table.addCell(createBodyCell("", fontRegular, Element.ALIGN_RIGHT));
                }
            }

            // Tätigkeit (Notes)
            String notes = day.getNotes();
            table.addCell(createBodyCell(notes != null ? notes : "", fontRegular, Element.ALIGN_LEFT));

            // Ort (Location or Status)
            String loc = day.getLocation();
            if ((loc == null || loc.isBlank()) && day.getStatus() != null) {
                loc = day.getStatus().getDisplayName();
            }
            table.addCell(createBodyCell(loc != null ? loc : "", fontRegular, Element.ALIGN_LEFT));
        }

        // Table Footer 1: Task column sums
        PdfPCell sumLabelCell = new PdfPCell(new Phrase("Summe", fontBold));
        sumLabelCell.setPadding(4f);
        sumLabelCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(sumLabelCell);

        for (String task : taskColumns) {
            Double sum = taskSums.get(task);
            PdfPCell taskSumCell = new PdfPCell(new Phrase(sum != null && sum > 0.0 ? formatPt(sum) : "", fontBold));
            taskSumCell.setPadding(4f);
            taskSumCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            table.addCell(taskSumCell);
        }

        PdfPCell emptyNotesCell = new PdfPCell(new Phrase("", fontRegular));
        emptyNotesCell.setPadding(4f);
        table.addCell(emptyNotesCell);

        PdfPCell emptyLocCell = new PdfPCell(new Phrase("", fontRegular));
        emptyLocCell.setPadding(4f);
        table.addCell(emptyLocCell);

        // Table Footer 2: Total PT row
        PdfPCell totalPtLabelCell = new PdfPCell(new Phrase("Gesamtzahl PT", fontBold));
        totalPtLabelCell.setPadding(4f);
        totalPtLabelCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(totalPtLabelCell);

        PdfPCell totalPtValCell = new PdfPCell(new Phrase(formatPt(totalPtSum), fontBold));
        totalPtValCell.setPadding(4f);
        totalPtValCell.setColspan(totalCols - 1);
        totalPtValCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(totalPtValCell);

        document.add(table);

        // Optional project footer text
        if (projectConfig != null && projectConfig.getPdfFooterText() != null && !projectConfig.getPdfFooterText().isBlank()) {
            Paragraph footer = new Paragraph(projectConfig.getPdfFooterText(), fontRegular);
            footer.setSpacingBefore(15f);
            document.add(footer);
        }
    }

    private PdfPCell createHeaderCell(String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(4f);
        cell.setHorizontalAlignment(alignment);
        return cell;
    }

    private PdfPCell createBodyCell(String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(4f);
        cell.setHorizontalAlignment(alignment);
        return cell;
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
}
