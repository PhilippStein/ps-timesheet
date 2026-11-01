package de.phstein.timesheet.rest;

import de.phstein.timesheet.config.AppConfig;
import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.PdfExportConfig;
import de.phstein.timesheet.config.ProjectConfig;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class TimesheetExportResourceTest {

    @Inject
    AppConfigService appConfigService;

    @TempDir
    static Path tempDir;

    @BeforeEach
    void setUp() {
        appConfigService.setCustomConfigPathForTesting(tempDir.resolve(".pstimesheet.yaml"));
        AppConfig config = new AppConfig();
        config.setPdfExport(new PdfExportConfig());
        appConfigService.saveConfig(config);

        ProjectConfig p1 = new ProjectConfig("PdfTestHours", tempDir.resolve("HoursProj").toString(), "WorkHours", List.of());
        p1.setPdfHeaderTitle("Tätigkeitsnachweis Entwicklung");
        ProjectConfig p2 = new ProjectConfig("PdfTestDays", tempDir.resolve("DaysProj").toString(), "PersonDays", List.of("Concept", "Dev"));
        appConfigService.addOrUpdateProject(p1);
        appConfigService.addOrUpdateProject(p2);
    }

    @Test
    void testExportPdfWorkHours() {
        given()
                .when().get("/api/timesheets/PdfTestHours/2026/10/pdf")
                .then()
                .statusCode(200)
                .contentType("application/pdf")
                .header("Content-Disposition", equalTo("attachment; filename=\"PdfTestHours_2026_10.pdf\""));
    }

    @Test
    void testExportPdfPersonDays() {
        given()
                .when().get("/api/timesheets/PdfTestDays/2026/10/pdf")
                .then()
                .statusCode(200)
                .contentType("application/pdf")
                .header("Content-Disposition", equalTo("attachment; filename=\"PdfTestDays_2026_10.pdf\""));
    }

    @Test
    void testExportDocxWorkHours() {
        given()
                .when().get("/api/timesheets/PdfTestHours/2026/10/docx")
                .then()
                .statusCode(200)
                .contentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                .header("Content-Disposition", equalTo("attachment; filename=\"PdfTestHours_2026_10.docx\""));
    }

    @Test
    void testExportDocxPersonDays() {
        given()
                .when().get("/api/timesheets/PdfTestDays/2026/10/docx")
                .then()
                .statusCode(200)
                .contentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                .header("Content-Disposition", equalTo("attachment; filename=\"PdfTestDays_2026_10.docx\""));
    }

    @Test
    void testExportXlsxWorkHours() {
        given()
                .when().get("/api/timesheets/PdfTestHours/2026/10/xlsx")
                .then()
                .statusCode(200)
                .contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("Content-Disposition", equalTo("attachment; filename=\"PdfTestHours_2026_10.xlsx\""));
    }

    @Test
    void testExportXlsxPersonDays() {
        given()
                .when().get("/api/timesheets/PdfTestDays/2026/10/xlsx")
                .then()
                .statusCode(200)
                .contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("Content-Disposition", equalTo("attachment; filename=\"PdfTestDays_2026_10.xlsx\""));
    }

    @Test
    void testExportPdfProjectNotFound() {
        given()
                .when().get("/api/timesheets/NonExistentProject/2026/10/pdf")
                .then()
                .statusCode(404);
    }

    @Test
    void testExportDocxProjectNotFound() {
        given()
                .when().get("/api/timesheets/NonExistentProject/2026/10/docx")
                .then()
                .statusCode(404);
    }

    @Test
    void testExportXlsxProjectNotFound() {
        given()
                .when().get("/api/timesheets/NonExistentProject/2026/10/xlsx")
                .then()
                .statusCode(404);
    }

    @Test
    void testExportPdfInvalidMonth() {
        given()
                .when().get("/api/timesheets/PdfTestHours/2026/13/pdf")
                .then()
                .statusCode(400);
    }

    @Test
    void testExportDocxInvalidMonth() {
        given()
                .when().get("/api/timesheets/PdfTestHours/2026/13/docx")
                .then()
                .statusCode(400);
    }

    @Test
    void testExportXlsxInvalidMonth() {
        given()
                .when().get("/api/timesheets/PdfTestHours/2026/13/xlsx")
                .then()
                .statusCode(400);
    }

    @Test
    void testExportPdfMissingStationeryThrows400() {
        AppConfig config = appConfigService.loadConfig();
        config.setPdfExport(new PdfExportConfig("/missing/file/stationery.pdf", 20.0, 20.0, 15.0, 15.0));
        appConfigService.saveConfig(config);

        given()
                .when().get("/api/timesheets/PdfTestHours/2026/10/pdf")
                .then()
                .statusCode(400);
    }

    @Test
    void testExportDocxMissingStationeryThrows400() {
        AppConfig config = appConfigService.loadConfig();
        config.setPdfExport(new PdfExportConfig("/missing/file/stationery.pdf", 20.0, 20.0, 15.0, 15.0));
        appConfigService.saveConfig(config);

        given()
                .when().get("/api/timesheets/PdfTestHours/2026/10/docx")
                .then()
                .statusCode(400);
    }
}
