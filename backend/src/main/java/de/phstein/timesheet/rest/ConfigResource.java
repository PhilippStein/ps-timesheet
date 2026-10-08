package de.phstein.timesheet.rest;

import de.phstein.timesheet.config.AppConfig;
import de.phstein.timesheet.config.AppConfigService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

@Path("/api/config")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ConfigResource {

    @Inject
    AppConfigService appConfigService;

    @GET
    public Response getConfig() {
        AppConfig config = appConfigService.getConfig();
        String activePath = appConfigService.getActiveConfigPath() != null
                ? appConfigService.getActiveConfigPath().toString()
                : "";
        return Response.ok(Map.of(
                "configPath", activePath,
                "projects", config.getProjects(),
                "hideEmptyWeekends", config.isHideEmptyWeekends()
        )).build();
    }

    @PUT
    public Response updateConfig(AppConfig config) {
        if (config == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("error", "Config body cannot be empty")).build();
        }
        appConfigService.saveConfig(config);
        return Response.ok(config).build();
    }
}
