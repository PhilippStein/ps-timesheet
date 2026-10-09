package de.phstein.timesheet.rest;

import de.phstein.timesheet.service.PdfExportService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;

@Path("/api/timesheets")
public class TimesheetExportResource {

    @Inject
    PdfExportService pdfExportService;

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
}
