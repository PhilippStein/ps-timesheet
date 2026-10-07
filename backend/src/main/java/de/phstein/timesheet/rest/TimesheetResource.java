package de.phstein.timesheet.rest;

import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.ProjectTreeDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import de.phstein.timesheet.service.TimesheetStorageService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;
import java.util.Optional;

@Path("/api/timesheets")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TimesheetResource {

    @Inject
    AppConfigService appConfigService;

    @Inject
    TimesheetStorageService storageService;

    @GET
    @Path("/{project}/tree")
    public Response getProjectTree(@PathParam("project") String projectName) {
        Optional<ProjectConfig> projectOpt = appConfigService.getProject(projectName);
        if (projectOpt.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Project not found: " + projectName))
                    .build();
        }

        ProjectTreeDTO tree = storageService.getProjectTree(projectOpt.get());
        return Response.ok(tree).build();
    }

    @GET
    @Path("/{project}/years-months")
    public Response getYearsMonths(@PathParam("project") String projectName) {
        return getProjectTree(projectName);
    }

    @GET
    @Path("/{project}/{year}/{month}")
    public Response getMonthTimesheet(
            @PathParam("project") String projectName,
            @PathParam("year") int year,
            @PathParam("month") int month) {

        if (month < 1 || month > 12) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Month must be between 1 and 12"))
                    .build();
        }

        Optional<ProjectConfig> projectOpt = appConfigService.getProject(projectName);
        if (projectOpt.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Project not found: " + projectName))
                    .build();
        }

        TimesheetMonthDTO monthDTO = storageService.loadOrCreateMonth(projectOpt.get(), year, month);
        return Response.ok(monthDTO).build();
    }

    @PUT
    @Path("/{project}/{year}/{month}")
    public Response saveMonthTimesheet(
            @PathParam("project") String projectName,
            @PathParam("year") int year,
            @PathParam("month") int month,
            TimesheetMonthDTO monthData) {

        if (month < 1 || month > 12) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Month must be between 1 and 12"))
                    .build();
        }
        if (monthData == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Timesheet data cannot be empty"))
                    .build();
        }

        Optional<ProjectConfig> projectOpt = appConfigService.getProject(projectName);
        if (projectOpt.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Project not found: " + projectName))
                    .build();
        }

        monthData.setProjectName(projectName);
        monthData.setYear(year);
        monthData.setMonth(month);

        TimesheetMonthDTO saved = storageService.saveMonth(projectOpt.get(), year, month, monthData);
        return Response.ok(saved).build();
    }
}
