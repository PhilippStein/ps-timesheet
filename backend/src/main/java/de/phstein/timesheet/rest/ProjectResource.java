package de.phstein.timesheet.rest;

import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.ProjectConfig;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Path("/api/projects")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ProjectResource {

    @Inject
    AppConfigService appConfigService;

    @GET
    public List<ProjectConfig> getProjects() {
        return appConfigService.getProjects();
    }

    @GET
    @Path("/{name}")
    public Response getProject(@PathParam("name") String name) {
        Optional<ProjectConfig> project = appConfigService.getProject(name);
        if (project.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Project not found: " + name))
                    .build();
        }
        return Response.ok(project.get()).build();
    }

    @POST
    public Response createOrUpdateProject(ProjectConfig project) {
        if (project == null || project.getName() == null || project.getName().isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Project name is required"))
                    .build();
        }
        if (project.getBasePath() == null || project.getBasePath().isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Project base path is required"))
                    .build();
        }

        ProjectConfig saved = appConfigService.addOrUpdateProject(project);
        return Response.status(Response.Status.CREATED).entity(saved).build();
    }

    @PUT
    @Path("/{name}")
    public Response updateProject(@PathParam("name") String name, ProjectConfig project) {
        if (project == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Project body is required"))
                    .build();
        }
        project.setName(name);
        if (project.getBasePath() == null || project.getBasePath().isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Project base path is required"))
                    .build();
        }

        ProjectConfig saved = appConfigService.addOrUpdateProject(project);
        return Response.ok(saved).build();
    }

    @DELETE
    @Path("/{name}")
    public Response deleteProject(@PathParam("name") String name) {
        boolean deleted = appConfigService.deleteProject(name);
        if (!deleted) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Project not found: " + name))
                    .build();
        }
        return Response.noContent().build();
    }
}
