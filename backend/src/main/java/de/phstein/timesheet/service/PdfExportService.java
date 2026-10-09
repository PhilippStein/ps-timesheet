package de.phstein.timesheet.service;

import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.PdfWriter;
import de.phstein.timesheet.config.AppConfig;
import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.PdfExportConfig;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

@ApplicationScoped
public class PdfExportService {

    private static final float MM_TO_PT = 72f / 25.4f;

    @Inject
    AppConfigService appConfigService;

    @Inject
    TimesheetStorageService storageService;

    @Inject
    PdfFontService pdfFontService;

    @Inject
    PersonDaysPdfRenderer personDaysPdfRenderer;

    @Inject
    WorkHoursPdfRenderer workHoursPdfRenderer;

    public byte[] exportTimesheetPdf(String projectName, int year, int month) {
        if (month < 1 || month > 12) {
            throw new BadRequestException("Month must be between 1 and 12");
        }

        Optional<ProjectConfig> projectOpt = appConfigService.getProject(projectName);
        if (projectOpt.isEmpty()) {
            throw new NotFoundException("Project not found: " + projectName);
        }

        ProjectConfig projectConfig = projectOpt.get();
        TimesheetMonthDTO monthDTO = storageService.loadOrCreateMonth(projectConfig, year, month);

        return generatePdf(monthDTO, projectConfig);
    }

    public byte[] generatePdf(TimesheetMonthDTO monthDTO, ProjectConfig projectConfig) {
        AppConfig appConfig = appConfigService.loadConfig();
        PdfExportConfig pdfExportConfig = appConfig != null ? appConfig.getPdfExport() : null;

        PdfReader templateReader = null;
        String templatePathStr = pdfExportConfig != null ? pdfExportConfig.getTemplatePdfPath() : null;
        if (templatePathStr != null && !templatePathStr.isBlank()) {
            Path resolvedPath = AppConfigService.resolvePath(templatePathStr);
            if (!Files.exists(resolvedPath) || !Files.isRegularFile(resolvedPath) || !Files.isReadable(resolvedPath)) {
                throw new BadRequestException("Briefpapier-Vorlage unter '" + templatePathStr + "' wurde nicht gefunden.");
            }
            try {
                templateReader = new PdfReader(Files.newInputStream(resolvedPath));
            } catch (Exception e) {
                throw new BadRequestException("Briefpapier-Vorlage unter '" + templatePathStr + "' konnte nicht gelesen werden: " + e.getMessage());
            }
        }

        double leftMm = pdfExportConfig != null ? pdfExportConfig.getMarginLeftMm() : 15.0;
        double rightMm = pdfExportConfig != null ? pdfExportConfig.getMarginRightMm() : 15.0;
        double topMm = pdfExportConfig != null ? pdfExportConfig.getMarginTopMm() : 20.0;
        double bottomMm = pdfExportConfig != null ? pdfExportConfig.getMarginBottomMm() : 20.0;

        float marginLeft = (float) (leftMm * MM_TO_PT);
        float marginRight = (float) (rightMm * MM_TO_PT);
        float marginTop = (float) (topMm * MM_TO_PT);
        float marginBottom = (float) (bottomMm * MM_TO_PT);

        Document document = new Document(PageSize.A4, marginLeft, marginRight, marginTop, marginBottom);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            PdfPageTemplateHelper helper = new PdfPageTemplateHelper(templateReader, pdfFontService);
            writer.setPageEvent(helper);

            document.open();

            String template = projectConfig != null ? projectConfig.getTemplate() : (monthDTO != null ? monthDTO.getTemplate() : "WorkHours");
            if ("PersonDays".equalsIgnoreCase(template)) {
                personDaysPdfRenderer.render(document, monthDTO, projectConfig);
            } else {
                workHoursPdfRenderer.render(document, monthDTO, projectConfig);
            }

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF document", e);
        } finally {
            if (templateReader != null) {
                try {
                    templateReader.close();
                } catch (Exception ignored) {
                }
            }
        }
    }
}
