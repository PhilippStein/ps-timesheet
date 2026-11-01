package de.phstein.timesheet.rest;

import de.phstein.timesheet.service.DocxExportService;
import de.phstein.timesheet.service.PdfExportService;
import de.phstein.timesheet.service.XlsxExportService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;

@Path("/api/timesheets")
public class TimesheetExportResource {

    public static final String DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    public static final String XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Inject
    PdfExportService pdfExportService;

    @Inject
    DocxExportService docxExportService;

    @Inject
    XlsxExportService xlsxExportService;

    @GET
    @Path("/{project}/{year}/{month}/pdf")
    @Produces("application/pdf")
    public Response exportPdf(
            @PathParam("project") String projectName,
            @PathParam("year") int year,
            @PathParam("month") int month) {

        byte[] pdfBytes = pdfExportService.exportTimesheetPdf(projectName, year, month);
        String filename = String.format("%s_%04d_%02d.pdf", projectName, year, month);

        return Response.ok(pdfBytes, "application/pdf")
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .build();
    }

    @GET
    @Path("/{project}/{year}/{month}/docx")
    @Produces(DOCX_MEDIA_TYPE)
    public Response exportDocx(
            @PathParam("project") String projectName,
            @PathParam("year") int year,
            @PathParam("month") int month) {

        byte[] docxBytes = docxExportService.exportTimesheetDocx(projectName, year, month);
        String filename = String.format("%s_%04d_%02d.docx", projectName, year, month);

        return Response.ok(docxBytes, DOCX_MEDIA_TYPE)
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .build();
    }

    @GET
    @Path("/{project}/{year}/{month}/xlsx")
    @Produces(XLSX_MEDIA_TYPE)
    public Response exportXlsx(
            @PathParam("project") String projectName,
            @PathParam("year") int year,
            @PathParam("month") int month) {

        byte[] xlsxBytes = xlsxExportService.exportTimesheetXlsx(projectName, year, month);
        String filename = String.format("%s_%04d_%02d.xlsx", projectName, year, month);

        return Response.ok(xlsxBytes, XLSX_MEDIA_TYPE)
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .build();
    }
}
