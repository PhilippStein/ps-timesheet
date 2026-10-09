package de.phstein.timesheet.rest;

import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.ProjectConfig;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class ProjectResourceTest {

    @Inject
    AppConfigService appConfigService;

    @TempDir
    static Path tempDir;

    @BeforeEach
    void setUp() {
        appConfigService.setCustomConfigPathForTesting(tempDir.resolve(".pstimesheet.yaml"));
        appConfigService.loadConfig();
    }

    @Test
    void testGetConfig() {
        given()
                .when().get("/api/config")
                .then()
                .statusCode(200)
                .body("projects", notNullValue());
    }

    @Test
    void testGetProjects() {
        given()
                .when().get("/api/projects")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(0));
    }

    @Test
    void testCreateAndGetProject() {
        ProjectConfig newProject = new ProjectConfig("ApiTestProject", "/tmp/api-test", "WorkHours", List.of());

        given()
                .contentType(ContentType.JSON)
                .body(newProject)
                .when().post("/api/projects")
                .then()
                .statusCode(201)
                .body("name", equalTo("ApiTestProject"))
                .body("template", equalTo("WorkHours"));

        given()
                .when().get("/api/projects/ApiTestProject")
                .then()
                .statusCode(200)
                .body("name", equalTo("ApiTestProject"))
                .body("basePath", equalTo("/tmp/api-test"));
    }

    @Test
    void testDeleteProject() {
        ProjectConfig newProject = new ProjectConfig("ToDelete", "/tmp/delete", "WorkHours", List.of());

        given()
                .contentType(ContentType.JSON)
                .body(newProject)
                .when().post("/api/projects")
                .then()
                .statusCode(201);

        given()
                .when().delete("/api/projects/ToDelete")
                .then()
                .statusCode(204);

        given()
                .when().get("/api/projects/ToDelete")
                .then()
                .statusCode(404);
    }
}
