package de.phstein.timesheet.service;

import de.phstein.timesheet.config.AppConfig;
import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.PdfExportConfig;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.DayStatus;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.poi.wp.usermodel.HeaderFooterType;
import org.apache.poi.xwpf.usermodel.*;
import org.apache.xmlbeans.XmlObject;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.*;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;

@ApplicationScoped
public class DocxExportService {

    private static final DateTimeFormatter DATE_FORMATTER_SHORT = DateTimeFormatter.ofPattern("dd.MM.yyyy", Locale.GERMAN);
    private static final DateTimeFormatter DATE_FORMATTER_LONG = DateTimeFormatter.ofPattern("EEEE, dd.MM.yyyy", Locale.GERMAN);
    private static final String FONT_FAMILY = "PT Sans";
    private static final String COLOR_HEADER_BG = "EEEEEE";

    @Inject
    AppConfigService appConfigService;

    @Inject
    TimesheetStorageService storageService;

    public byte[] exportTimesheetDocx(String projectName, int year, int month) {
        if (month < 1 || month > 12) {
            throw new BadRequestException("Month must be between 1 and 12");
        }

        Optional<ProjectConfig> projectOpt = appConfigService.getProject(projectName);
        if (projectOpt.isEmpty()) {
            throw new NotFoundException("Project not found: " + projectName);
        }

        ProjectConfig projectConfig = projectOpt.get();
        TimesheetMonthDTO monthDTO = storageService.loadOrCreateMonth(projectConfig, year, month);

        return generateDocx(monthDTO, projectConfig);
    }

    public byte[] generateDocx(TimesheetMonthDTO monthDTO, ProjectConfig projectConfig) {
        AppConfig appConfig = appConfigService.loadConfig();
        PdfExportConfig pdfExportConfig = appConfig != null ? appConfig.getPdfExport() : null;

        byte[] stationeryImageBytes = null;
        String templatePathStr = pdfExportConfig != null ? pdfExportConfig.getTemplatePdfPath() : null;
        if (templatePathStr != null && !templatePathStr.isBlank()) {
            Path resolvedPath = AppConfigService.resolvePath(templatePathStr);
            if (!Files.exists(resolvedPath) || !Files.isRegularFile(resolvedPath) || !Files.isReadable(resolvedPath)) {
                throw new BadRequestException("Briefpapier-Vorlage unter '" + templatePathStr + "' wurde nicht gefunden.");
            }
            try (PDDocument pdDocument = Loader.loadPDF(resolvedPath.toFile())) {
                if (pdDocument.getNumberOfPages() > 0) {
                    PDFRenderer renderer = new PDFRenderer(pdDocument);
                    BufferedImage image = renderer.renderImageWithDPI(0, 300, ImageType.RGB);
                    ByteArrayOutputStream imageBaos = new ByteArrayOutputStream();
                    ImageIO.write(image, "PNG", imageBaos);
                    stationeryImageBytes = imageBaos.toByteArray();
                }
            } catch (Exception e) {
                throw new BadRequestException("Briefpapier-Vorlage unter '" + templatePathStr + "' konnte nicht gelesen werden: " + e.getMessage());
            }
        }

        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            applyPageSetupAndStationery(document, pdfExportConfig, stationeryImageBytes);

            double leftMm = pdfExportConfig != null ? pdfExportConfig.getMarginLeftMm() : 15.0;
            double rightMm = pdfExportConfig != null ? pdfExportConfig.getMarginRightMm() : 15.0;
            long leftTwips = Math.round(leftMm * 56.6929133858);
            long rightTwips = Math.round(rightMm * 56.6929133858);
            long contentWidthDxa = 11906 - leftTwips - rightTwips;

            String template = projectConfig != null ? projectConfig.getTemplate() : (monthDTO != null ? monthDTO.getTemplate() : "WorkHours");
            if ("PersonDays".equalsIgnoreCase(template)) {
                renderPersonDays(document, monthDTO, projectConfig, contentWidthDxa);
            } else {
                renderWorkHours(document, monthDTO, projectConfig, contentWidthDxa);
            }

            document.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate DOCX document", e);
        }
    }

    private void applyPageSetupAndStationery(XWPFDocument document, PdfExportConfig pdfExportConfig, byte[] stationeryImageBytes) {
        CTSectPr sectPr = document.getDocument().getBody().isSetSectPr()
                ? document.getDocument().getBody().getSectPr()
                : document.getDocument().getBody().addNewSectPr();

        // A4 Page Size (210mm x 297mm in twips: 1mm = 56.6929 twips)
        CTPageSz pageSz = sectPr.isSetPgSz() ? sectPr.getPgSz() : sectPr.addNewPgSz();
        pageSz.setW(BigInteger.valueOf(11906));
        pageSz.setH(BigInteger.valueOf(16838));

        double leftMm = pdfExportConfig != null ? pdfExportConfig.getMarginLeftMm() : 15.0;
        double rightMm = pdfExportConfig != null ? pdfExportConfig.getMarginRightMm() : 15.0;
        double topMm = pdfExportConfig != null ? pdfExportConfig.getMarginTopMm() : 20.0;
        double bottomMm = pdfExportConfig != null ? pdfExportConfig.getMarginBottomMm() : 20.0;

        long topTwips = Math.round(topMm * 56.6929133858);
        long bottomTwips = Math.round(bottomMm * 56.6929133858);
        long leftTwips = Math.round(leftMm * 56.6929133858);
        long rightTwips = Math.round(rightMm * 56.6929133858);
        long footerTwips = Math.round(bottomTwips / 2.0);

        CTPageMar pageMar = sectPr.isSetPgMar() ? sectPr.getPgMar() : sectPr.addNewPgMar();
        pageMar.setTop(BigInteger.valueOf(topTwips));
        pageMar.setBottom(BigInteger.valueOf(bottomTwips));
        pageMar.setLeft(BigInteger.valueOf(leftTwips));
        pageMar.setRight(BigInteger.valueOf(rightTwips));
        pageMar.setHeader(BigInteger.valueOf(0));
        pageMar.setFooter(BigInteger.valueOf(footerTwips));

        if (stationeryImageBytes != null && stationeryImageBytes.length > 0) {
            addStationeryBackground(document, stationeryImageBytes);
        }

        addFooterPagination(document);
    }

    private void addFooterPagination(XWPFDocument document) {
        XWPFFooter footer = document.createFooter(HeaderFooterType.DEFAULT);
        XWPFParagraph footerPara = footer.createParagraph();
        footerPara.setAlignment(ParagraphAlignment.RIGHT);
        footerPara.setSpacingBefore(0);
        footerPara.setSpacingAfter(0);

        // "Seite "
        XWPFRun r1 = footerPara.createRun();
        r1.setFontFamily(FONT_FAMILY);
        r1.setFontSize(9);
        r1.setText("Seite ");

        // PAGE field
        CTSimpleField pageField = footerPara.getCTP().addNewFldSimple();
        pageField.setInstr("PAGE");
        CTR rPage = pageField.addNewR();
        CTRPr rPrPage = rPage.addNewRPr();
        rPrPage.addNewRFonts().setAscii(FONT_FAMILY);
        rPrPage.addNewRFonts().setHAnsi(FONT_FAMILY);
        rPrPage.addNewRFonts().setCs(FONT_FAMILY);
        CTHpsMeasure szPage = rPrPage.addNewSz();
        szPage.setVal(BigInteger.valueOf(18));
        rPrPage.addNewSzCs().setVal(BigInteger.valueOf(18));
        rPage.addNewT().setStringValue("1");

        // "/"
        XWPFRun r2 = footerPara.createRun();
        r2.setFontFamily(FONT_FAMILY);
        r2.setFontSize(9);
        r2.setText("/");

        // NUMPAGES field
        CTSimpleField numPagesField = footerPara.getCTP().addNewFldSimple();
        numPagesField.setInstr("NUMPAGES");
        CTR rNumPages = numPagesField.addNewR();
        CTRPr rPrNum = rNumPages.addNewRPr();
        rPrNum.addNewRFonts().setAscii(FONT_FAMILY);
        rPrNum.addNewRFonts().setHAnsi(FONT_FAMILY);
        rPrNum.addNewRFonts().setCs(FONT_FAMILY);
        CTHpsMeasure szNum = rPrNum.addNewSz();
        szNum.setVal(BigInteger.valueOf(18));
        rPrNum.addNewSzCs().setVal(BigInteger.valueOf(18));
        rNumPages.addNewT().setStringValue("1");
    }

    private void addStationeryBackground(XWPFDocument document, byte[] stationeryImageBytes) {
        try {
            XWPFHeader header = document.createHeader(HeaderFooterType.DEFAULT);
            XWPFParagraph headerPara = header.createParagraph();
            headerPara.setSpacingBefore(0);
            headerPara.setSpacingAfter(0);
            XWPFRun headerRun = headerPara.createRun();

            String rId = header.addPictureData(new ByteArrayInputStream(stationeryImageBytes), Document.PICTURE_TYPE_PNG);

            long cx = 7560000L; // 210mm in EMU (210 * 36000)
            long cy = 10692000L; // 297mm in EMU (297 * 36000)

            String anchorXml =
                    "<wp:anchor xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" " +
                    "           xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" " +
                    "           xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\" " +
                    "           xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" " +
                    "           distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\" simplePos=\"0\" relativeHeight=\"251658240\" behindDoc=\"1\" locked=\"0\" layoutInCell=\"1\" allowOverlap=\"1\">" +
                    "    <wp:simplePos x=\"0\" y=\"0\"/>" +
                    "    <wp:positionH relativeFrom=\"page\">" +
                    "        <wp:posOffset>0</wp:posOffset>" +
                    "    </wp:positionH>" +
                    "    <wp:positionV relativeFrom=\"page\">" +
                    "        <wp:posOffset>0</wp:posOffset>" +
                    "    </wp:positionV>" +
                    "    <wp:extent cx=\"" + cx + "\" cy=\"" + cy + "\"/>" +
                    "    <wp:effectExtent l=\"0\" t=\"0\" r=\"0\" b=\"0\"/>" +
                    "    <wp:wrapNone/>" +
                    "    <wp:docPr id=\"1\" name=\"Stationery Background\"/>" +
                    "    <wp:cNvGraphicFramePr>" +
                    "        <a:graphicFrameLocks noChangeAspect=\"1\"/>" +
                    "    </wp:cNvGraphicFramePr>" +
                    "    <a:graphic>" +
                    "        <a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">" +
                    "            <pic:pic>" +
                    "                <pic:nvPicPr>" +
                    "                    <pic:cNvPr id=\"0\" name=\"Stationery.png\"/>" +
                    "                    <pic:cNvPicPr>" +
                    "                        <a:picLocks noChangeAspect=\"1\" noChangeArrowheads=\"1\"/>" +
                    "                    </pic:cNvPicPr>" +
                    "                </pic:nvPicPr>" +
                    "                <pic:blipFill>" +
                    "                    <a:blip r:embed=\"" + rId + "\"/>" +
                    "                    <a:stretch>" +
                    "                        <a:fillRect/>" +
                    "                    </a:stretch>" +
                    "                </pic:blipFill>" +
                    "                <pic:spPr>" +
                    "                    <a:xfrm>" +
                    "                        <a:off x=\"0\" y=\"0\"/>" +
                    "                        <a:ext cx=\"" + cx + "\" cy=\"" + cy + "\"/>" +
                    "                    </a:xfrm>" +
                    "                    <a:prstGeom prst=\"rect\">" +
                    "                        <a:avLst/>" +
                    "                    </a:prstGeom>" +
                    "                </pic:spPr>" +
                    "            </pic:pic>" +
                    "        </a:graphicData>" +
                    "    </a:graphic>" +
                    "</wp:anchor>";

            CTDrawing drawing = headerRun.getCTR().addNewDrawing();
            XmlObject xmlObject = XmlObject.Factory.parse(anchorXml);
            drawing.set(xmlObject);
        } catch (Exception e) {
            throw new RuntimeException("Failed to embed stationery background into DOCX header", e);
        }
    }

    private void renderPersonDays(XWPFDocument document, TimesheetMonthDTO monthDTO, ProjectConfig projectConfig, long contentWidthDxa) {
        // Document Title: "Leistungsschein <Monat> <Jahr>" in 12pt Bold
        String monthName = Month.of(monthDTO.getMonth()).getDisplayName(TextStyle.FULL, Locale.GERMAN);
        XWPFParagraph titlePara = document.createParagraph();
        titlePara.setSpacingAfter(200);
        XWPFRun titleRun = titlePara.createRun();
        titleRun.setFontFamily(FONT_FAMILY);
        titleRun.setFontSize(12);
        titleRun.setBold(true);
        titleRun.setText("Leistungsschein " + monthName + " " + monthDTO.getYear());

        List<String> taskColumns = monthDTO.getTaskColumns() != null ? monthDTO.getTaskColumns() : new ArrayList<>();
        int totalCols = 1 + taskColumns.size() + 2; // Datum + Tasks + Tätigkeit + Ort

        XWPFTable table = document.createTable();
        setupTableProperties(table, contentWidthDxa);

        // Header Row
        XWPFTableRow headerRow = table.getRow(0);
        headerRow.setRepeatHeader(true);
        headerRow.setCantSplitRow(true);

        // Cell 0: Datum
        populateCell(getOrCreateCell(headerRow, 0), "Datum", true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);

        // Task Columns
        int hCol = 1;
        for (String task : taskColumns) {
            populateCell(getOrCreateCell(headerRow, hCol++), task, true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);
        }

        // Tätigkeit
        populateCell(getOrCreateCell(headerRow, hCol++), "Tätigkeit", true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);

        // Ort
        populateCell(getOrCreateCell(headerRow, hCol++), "Ort", true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);
        trimRowToSize(headerRow, totalCols);

        // Body rows
        Map<String, Double> taskSums = new HashMap<>();
        double totalPtSum = 0.0;

        for (TimesheetDayDTO day : monthDTO.getDays()) {
            XWPFTableRow row = table.createRow();
            row.setCantSplitRow(true);

            // Datum
            String dateFormatted = "";
            String weekday = "";
            String dateOnly = "";
            if (day.getDate() != null && !day.getDate().isBlank()) {
                try {
                    LocalDate ld = LocalDate.parse(day.getDate());
                    weekday = ld.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.GERMAN) + ",";
                    dateOnly = ld.format(DATE_FORMATTER_SHORT);
                } catch (Exception ignored) {
                    dateFormatted = day.getDate();
                }
            }

            XWPFTableCell dateCell = getOrCreateCell(row, 0);
            if (!weekday.isEmpty()) {
                populateCellTwoLines(dateCell, weekday, dateOnly, false, ParagraphAlignment.RIGHT, null);
            } else {
                populateCell(dateCell, dateFormatted, false, ParagraphAlignment.RIGHT, null);
            }

            // Task allocations
            int colIdx = 1;
            for (String task : taskColumns) {
                Double pt = day.getTaskAllocations() != null ? day.getTaskAllocations().get(task) : null;
                XWPFTableCell taskCell = getOrCreateCell(row, colIdx++);
                if (pt != null && pt > 0.0) {
                    taskSums.put(task, taskSums.getOrDefault(task, 0.0) + pt);
                    totalPtSum += pt;
                    populateCell(taskCell, formatPt(pt), false, ParagraphAlignment.CENTER, null);
                } else {
                    populateCell(taskCell, "", false, ParagraphAlignment.CENTER, null);
                }
            }

            // Tätigkeit (Bullet points)
            XWPFTableCell notesCell = getOrCreateCell(row, colIdx++);
            populateNotesCell(notesCell, day.getNotesList());

            // Ort
            String loc = day.getLocation();
            if ((loc == null || loc.isBlank()) && day.getStatus() != null) {
                loc = day.getStatus().getDisplayName();
            }
            XWPFTableCell locCell = getOrCreateCell(row, colIdx++);
            populateCell(locCell, loc != null ? loc : "", false, ParagraphAlignment.LEFT, null);
            trimRowToSize(row, totalCols);
        }

        // Sum row: Task column sums
        XWPFTableRow sumRow = table.createRow();
        sumRow.setCantSplitRow(true);
        populateCell(getOrCreateCell(sumRow, 0), "Summe", true, ParagraphAlignment.LEFT, COLOR_HEADER_BG);

        int sumColIdx = 1;
        for (String task : taskColumns) {
            Double sum = taskSums.get(task);
            XWPFTableCell taskSumCell = getOrCreateCell(sumRow, sumColIdx++);
            populateCell(taskSumCell, sum != null && sum > 0.0 ? formatPt(sum) : "", true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);
        }
        populateCell(getOrCreateCell(sumRow, sumColIdx++), "", false, ParagraphAlignment.LEFT, COLOR_HEADER_BG);
        populateCell(getOrCreateCell(sumRow, sumColIdx++), "", false, ParagraphAlignment.LEFT, COLOR_HEADER_BG);
        trimRowToSize(sumRow, totalCols);

        // Total PT row
        XWPFTableRow totalRow = table.createRow();
        totalRow.setCantSplitRow(true);
        XWPFTableCell totalLabelCell = getOrCreateCell(totalRow, 0);
        populateCell(totalLabelCell, "Gesamtzahl PT", true, ParagraphAlignment.LEFT, COLOR_HEADER_BG);
        setCellColspan(totalLabelCell, 2);

        XWPFTableCell totalValCell = getOrCreateCell(totalRow, 1);
        populateCell(totalValCell, formatPt(totalPtSum), true, ParagraphAlignment.LEFT, COLOR_HEADER_BG);
        if (totalCols > 2) {
            setCellColspan(totalValCell, totalCols - 2);
        }
        trimRowToSize(totalRow, 2);

        // Column widths: widen "Tätigkeit" to take up all remaining width of the page
        long datumWidth = 1400;
        long taskWidth = 750;
        long ortWidth = 1200;
        long taetigkeitWidth = contentWidthDxa - datumWidth - ortWidth - (taskWidth * taskColumns.size());
        if (taetigkeitWidth < 3000) {
            taetigkeitWidth = 3000;
        }

        long[] colWidths = new long[totalCols];
        colWidths[0] = datumWidth;
        for (int i = 0; i < taskColumns.size(); i++) {
            colWidths[1 + i] = taskWidth;
        }
        colWidths[1 + taskColumns.size()] = taetigkeitWidth;
        colWidths[2 + taskColumns.size()] = ortWidth;

        applyColumnWidths(table, colWidths);

        // Optional project footer text
        if (projectConfig != null && projectConfig.getPdfFooterText() != null && !projectConfig.getPdfFooterText().isBlank()) {
            XWPFParagraph footerPara = document.createParagraph();
            footerPara.setSpacingBefore(300);
            String[] lines = projectConfig.getPdfFooterText().split("\n");
            for (int i = 0; i < lines.length; i++) {
                XWPFRun r = footerPara.createRun();
                r.setFontFamily(FONT_FAMILY);
                r.setFontSize(10.5);
                r.setText(lines[i]);
                if (i < lines.length - 1) {
                    r.addBreak();
                }
            }
        }
    }

    private void renderWorkHours(XWPFDocument document, TimesheetMonthDTO monthDTO, ProjectConfig projectConfig, long contentWidthDxa) {
        String monthName = Month.of(monthDTO.getMonth()).getDisplayName(TextStyle.FULL, Locale.GERMAN);
        String yearStr = String.valueOf(monthDTO.getYear());
        String headerTitle = (projectConfig != null && projectConfig.getPdfHeaderTitle() != null && !projectConfig.getPdfHeaderTitle().isBlank())
                ? projectConfig.getPdfHeaderTitle()
                : (projectConfig != null && projectConfig.getName() != null ? projectConfig.getName() : monthDTO.getProjectName());

        YearMonth ym = YearMonth.of(monthDTO.getYear(), monthDTO.getMonth());
        LocalDate monthEnd = ym.atEndOfMonth();
        String monthEndStr = monthEnd.format(DATE_FORMATTER_SHORT);

        XWPFTable table = document.createTable();
        setupTableProperties(table, contentWidthDxa);

        // Header Row 1: <Monat> | <Jahr> | <Header-Text> (span 3) | <Monatsende>
        XWPFTableRow headerRow1 = table.getRow(0);
        headerRow1.setRepeatHeader(true);
        headerRow1.setCantSplitRow(true);

        populateCell(getOrCreateCell(headerRow1, 0), monthName, true, ParagraphAlignment.LEFT, COLOR_HEADER_BG);

        XWPFTableCell yearCell = getOrCreateCell(headerRow1, 1);
        populateCell(yearCell, yearStr, true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);

        XWPFTableCell titleCell = getOrCreateCell(headerRow1, 2);
        populateCell(titleCell, headerTitle, true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);
        setCellColspan(titleCell, 3);

        XWPFTableCell monthEndCell = getOrCreateCell(headerRow1, 3);
        populateCell(monthEndCell, monthEndStr, true, ParagraphAlignment.RIGHT, COLOR_HEADER_BG);
        trimRowToSize(headerRow1, 4);

        // Header Row 2: Datum | Start | Ende | Pause | Summe | Bemerkung
        XWPFTableRow headerRow2 = table.createRow();
        headerRow2.setRepeatHeader(true);
        headerRow2.setCantSplitRow(true);

        populateCell(getOrCreateCell(headerRow2, 0), "Datum", true, ParagraphAlignment.LEFT, COLOR_HEADER_BG);
        populateCell(getOrCreateCell(headerRow2, 1), "Start", true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);
        populateCell(getOrCreateCell(headerRow2, 2), "Ende", true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);
        populateCell(getOrCreateCell(headerRow2, 3), "Pause", true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);
        populateCell(getOrCreateCell(headerRow2, 4), "Summe", true, ParagraphAlignment.RIGHT, COLOR_HEADER_BG);
        populateCell(getOrCreateCell(headerRow2, 5), "Bemerkung", true, ParagraphAlignment.LEFT, COLOR_HEADER_BG);
        trimRowToSize(headerRow2, 6);

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
                XWPFTableRow dataRow = table.createRow();
                dataRow.setCantSplitRow(true);

                String dateStr = ld != null ? ld.format(DATE_FORMATTER_SHORT) : (day.getDate() != null ? day.getDate() : "");
                String startStr = day.getStartTime() != null ? day.getStartTime() : "";
                String endStr = day.getEndTime() != null ? day.getEndTime() : "";
                String pauseStr = day.getPauseMinutes() != null && day.getPauseMinutes() > 0 ? formatMinutesToHhMm(day.getPauseMinutes()) : "";
                String sumStr = netHours != null && netHours > 0.0 ? formatHoursToHhMm(netHours) : "";

                String comment = day.getComment();
                if ((comment == null || comment.isBlank()) && day.getStatus() != null) {
                    comment = day.getStatus().getDisplayName();
                }

                populateCell(getOrCreateCell(dataRow, 0), dateStr, false, ParagraphAlignment.LEFT, null);
                populateCell(getOrCreateCell(dataRow, 1), startStr, false, ParagraphAlignment.CENTER, null);
                populateCell(getOrCreateCell(dataRow, 2), endStr, false, ParagraphAlignment.CENTER, null);
                populateCell(getOrCreateCell(dataRow, 3), pauseStr, false, ParagraphAlignment.CENTER, null);
                populateCell(getOrCreateCell(dataRow, 4), sumStr, false, ParagraphAlignment.RIGHT, null);
                populateCell(getOrCreateCell(dataRow, 5), comment != null ? comment : "", false, ParagraphAlignment.LEFT, null);
                trimRowToSize(dataRow, 6);
            }

            boolean isSunday = ld != null && ld.getDayOfWeek() == DayOfWeek.SUNDAY;
            boolean isLastDay = (i == days.size() - 1);

            if (isSunday || isLastDay) {
                XWPFTableRow weekSumRow = table.createRow();
                weekSumRow.setCantSplitRow(true);

                populateCell(getOrCreateCell(weekSumRow, 0), "Summe", true, ParagraphAlignment.LEFT, COLOR_HEADER_BG);
                populateCell(getOrCreateCell(weekSumRow, 1), "", true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);
                populateCell(getOrCreateCell(weekSumRow, 2), "", true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);
                populateCell(getOrCreateCell(weekSumRow, 3), "", true, ParagraphAlignment.CENTER, COLOR_HEADER_BG);
                populateCell(getOrCreateCell(weekSumRow, 4), formatHoursToHhMm(currentWeekNetHours), true, ParagraphAlignment.RIGHT, COLOR_HEADER_BG);
                populateCell(getOrCreateCell(weekSumRow, 5), "", true, ParagraphAlignment.LEFT, COLOR_HEADER_BG);
                trimRowToSize(weekSumRow, 6);

                currentWeekNetHours = 0.0;
            }
        }

        // Monthly Sum Row
        XWPFTableRow monthSumRow = table.createRow();
        monthSumRow.setCantSplitRow(true);
        XWPFTableCell sumLabelCell = getOrCreateCell(monthSumRow, 0);
        populateCell(sumLabelCell, "Monatssumme", true, ParagraphAlignment.LEFT, COLOR_HEADER_BG);
        setCellColspan(sumLabelCell, 4);

        populateCell(getOrCreateCell(monthSumRow, 1), formatHoursToHhMm(totalMonthlyNetHours), true, ParagraphAlignment.RIGHT, COLOR_HEADER_BG);
        populateCell(getOrCreateCell(monthSumRow, 2), "", false, ParagraphAlignment.LEFT, COLOR_HEADER_BG);
        trimRowToSize(monthSumRow, 3);

        // Column widths: Datum, Start, Ende, Pause, Summe, Bemerkung (all extra width goes to Bemerkung)
        long datumWidth = 1300;
        long startWidth = 950;
        long endWidth = 950;
        long pauseWidth = 950;
        long sumWidth = 1100;
        long bemerkungWidth = contentWidthDxa - datumWidth - startWidth - endWidth - pauseWidth - sumWidth;
        if (bemerkungWidth < 3000) {
            bemerkungWidth = 3000;
        }

        long[] colWidths = new long[]{datumWidth, startWidth, endWidth, pauseWidth, sumWidth, bemerkungWidth};
        applyColumnWidths(table, colWidths);

        // Statistics Summary Table
        int workingDays = monthDTO.getWorkingDays() != null ? monthDTO.getWorkingDays() : monthDTO.calculateWorkingDays();
        double targetHours = workingDays * 8.0;
        double diffHours = totalMonthlyNetHours - targetHours;

        XWPFParagraph spacer = document.createParagraph();
        spacer.setSpacingBefore(200);

        XWPFTable statTable = document.createTable();
        long statTableWidth = 4600;
        setupTableProperties(statTable, statTableWidth);

        addStatRow(statTable.getRow(0), "Arbeitstage", String.valueOf(workingDays));
        addStatRow(statTable.createRow(), "Sollstunden", String.format(Locale.US, "%.2f", targetHours));
        addStatRow(statTable.createRow(), "Ist-Stunden", String.format(Locale.US, "%.2f", totalMonthlyNetHours));
        addStatRow(statTable.createRow(), "Differenz", String.format(Locale.US, "%.2f", diffHours));
        addStatRow(statTable.createRow(), "Urlaub", String.format(Locale.US, "%.1f", (double) vacationDays));

        applyColumnWidths(statTable, new long[]{2500, 2100});

        // Optional project footer text
        if (projectConfig != null && projectConfig.getPdfFooterText() != null && !projectConfig.getPdfFooterText().isBlank()) {
            XWPFParagraph footerPara = document.createParagraph();
            footerPara.setSpacingBefore(300);
            String[] lines = projectConfig.getPdfFooterText().split("\n");
            for (int i = 0; i < lines.length; i++) {
                XWPFRun r = footerPara.createRun();
                r.setFontFamily(FONT_FAMILY);
                r.setFontSize(10.5);
                r.setText(lines[i]);
                if (i < lines.length - 1) {
                    r.addBreak();
                }
            }
        }
    }

    private XWPFTableCell getOrCreateCell(XWPFTableRow row, int index) {
        while (row.getTableCells().size() <= index) {
            row.addNewTableCell();
        }
        return row.getCell(index);
    }

    private void trimRowToSize(XWPFTableRow row, int targetSize) {
        while (row.getTableCells().size() > targetSize) {
            int lastIdx = row.getTableCells().size() - 1;
            row.removeCell(lastIdx);
        }
    }

    private void addStatRow(XWPFTableRow row, String label, String value) {
        row.setCantSplitRow(true);
        XWPFTableCell c0 = row.getCell(0);
        XWPFTableCell c1 = row.getCell(1) != null ? row.getCell(1) : row.addNewTableCell();
        populateCell(c0, label, false, ParagraphAlignment.LEFT, null);
        populateCell(c1, value, false, ParagraphAlignment.RIGHT, null);
    }

    private void setupTableProperties(XWPFTable table, long widthDxa) {
        CTTblPr tblPr = table.getCTTbl().getTblPr();
        CTTblWidth tblW = tblPr.isSetTblW() ? tblPr.getTblW() : tblPr.addNewTblW();
        tblW.setType(STTblWidth.DXA);
        tblW.setW(BigInteger.valueOf(widthDxa));

        table.setTopBorder(XWPFTable.XWPFBorderType.SINGLE, 4, 0, "646464");
        table.setBottomBorder(XWPFTable.XWPFBorderType.SINGLE, 4, 0, "646464");
        table.setLeftBorder(XWPFTable.XWPFBorderType.SINGLE, 4, 0, "646464");
        table.setRightBorder(XWPFTable.XWPFBorderType.SINGLE, 4, 0, "646464");
        table.setInsideHBorder(XWPFTable.XWPFBorderType.SINGLE, 4, 0, "A0A0A0");
        table.setInsideVBorder(XWPFTable.XWPFBorderType.SINGLE, 4, 0, "A0A0A0");
        table.setCellMargins(80, 100, 80, 100);
    }

    private void applyColumnWidths(XWPFTable table, long[] colWidths) {
        CTTblGrid tblGrid = table.getCTTbl().getTblGrid() != null ? table.getCTTbl().getTblGrid() : table.getCTTbl().addNewTblGrid();
        while (!tblGrid.getGridColList().isEmpty()) {
            tblGrid.removeGridCol(0);
        }
        for (long w : colWidths) {
            tblGrid.addNewGridCol().setW(BigInteger.valueOf(w));
        }

        for (XWPFTableRow row : table.getRows()) {
            int gridIdx = 0;
            for (XWPFTableCell cell : row.getTableCells()) {
                CTTcPr tcPr = cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
                int gridSpan = 1;
                if (tcPr.isSetGridSpan()) {
                    gridSpan = tcPr.getGridSpan().getVal().intValue();
                }
                long cellWidth = 0;
                for (int g = 0; g < gridSpan && (gridIdx + g) < colWidths.length; g++) {
                    cellWidth += colWidths[gridIdx + g];
                }
                gridIdx += gridSpan;

                CTTblWidth tcW = tcPr.isSetTcW() ? tcPr.getTcW() : tcPr.addNewTcW();
                tcW.setType(STTblWidth.DXA);
                tcW.setW(BigInteger.valueOf(cellWidth));
            }
        }
    }

    private void populateCell(XWPFTableCell cell, String text, boolean bold, ParagraphAlignment align, String bgColor) {
        if (cell == null) return;
        cell.setVerticalAlignment(XWPFTableCell.XWPFVertAlign.CENTER);
        if (bgColor != null) {
            cell.setColor(bgColor);
        }
        XWPFParagraph p = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        p.setAlignment(align);
        p.setSpacingBefore(0);
        p.setSpacingAfter(0);

        // Clear existing runs
        while (!p.getRuns().isEmpty()) {
            p.removeRun(0);
        }

        XWPFRun r = p.createRun();
        r.setFontFamily(FONT_FAMILY);
        r.setFontSize(10);
        r.setBold(bold);
        r.setText(text != null ? text : "");
    }

    private void populateCellTwoLines(XWPFTableCell cell, String line1, String line2, boolean bold, ParagraphAlignment align, String bgColor) {
        if (cell == null) return;
        cell.setVerticalAlignment(XWPFTableCell.XWPFVertAlign.CENTER);
        if (bgColor != null) {
            cell.setColor(bgColor);
        }
        XWPFParagraph p = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        p.setAlignment(align);
        p.setSpacingBefore(0);
        p.setSpacingAfter(0);

        while (!p.getRuns().isEmpty()) {
            p.removeRun(0);
        }

        XWPFRun r1 = p.createRun();
        r1.setFontFamily(FONT_FAMILY);
        r1.setFontSize(10);
        r1.setBold(bold);
        r1.setText(line1);
        r1.addBreak();

        XWPFRun r2 = p.createRun();
        r2.setFontFamily(FONT_FAMILY);
        r2.setFontSize(10);
        r2.setBold(bold);
        r2.setText(line2);
    }

    private void populateNotesCell(XWPFTableCell cell, List<String> notesList) {
        if (cell == null) return;
        cell.setVerticalAlignment(XWPFTableCell.XWPFVertAlign.CENTER);
        XWPFParagraph p = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        p.setAlignment(ParagraphAlignment.LEFT);
        p.setSpacingBefore(0);
        p.setSpacingAfter(0);

        while (!p.getRuns().isEmpty()) {
            p.removeRun(0);
        }

        if (notesList != null && !notesList.isEmpty()) {
            for (int i = 0; i < notesList.size(); i++) {
                XWPFRun r = p.createRun();
                r.setFontFamily(FONT_FAMILY);
                r.setFontSize(10);
                r.setText("• " + notesList.get(i));
                if (i < notesList.size() - 1) {
                    r.addBreak();
                }
            }
        }
    }

    private void setCellColspan(XWPFTableCell cell, int colSpan) {
        if (colSpan > 1 && cell != null) {
            CTTcPr tcPr = cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
            tcPr.addNewGridSpan().setVal(BigInteger.valueOf(colSpan));
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
