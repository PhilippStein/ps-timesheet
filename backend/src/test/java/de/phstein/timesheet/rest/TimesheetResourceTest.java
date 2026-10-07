package de.phstein.timesheet.rest;

import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.TimesheetDayDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
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
class TimesheetResourceTest {

    @Inject
    AppConfigService appConfigService;

    @TempDir
    static Path tempDir;

    @BeforeEach
    void setUp() {
        appConfigService.setCustomConfigPathForTesting(tempDir.resolve(".pstimesheet.yaml"));
        appConfigService.loadConfig();

        ProjectConfig p1 = new ProjectConfig("ResourceTestHours", tempDir.resolve("HoursProj").toString(), "WorkHours", List.of());
        ProjectConfig p2 = new ProjectConfig("ResourceTestDays", tempDir.resolve("DaysProj").toString(), "PersonDays", List.of("TaskA", "TaskB"));
        appConfigService.addOrUpdateProject(p1);
        appConfigService.addOrUpdateProject(p2);
    }

    @Test
    void testGetProjectTree() {
        given()
                .when().get("/api/timesheets/ResourceTestHours/tree")
                .then()
                .statusCode(200)
                .body("projectName", equalTo("ResourceTestHours"))
                .body("years", notNullValue());
    }

    @Test
    void testGetAndSaveMonthWorkHours() {
        // Auto-creates month on first GET
        TimesheetMonthDTO month = given()
                .when().get("/api/timesheets/ResourceTestHours/2026/10")
                .then()
                .statusCode(200)
                .body("projectName", equalTo("ResourceTestHours"))
                .body("template", equalTo("WorkHours"))
                .body("days.size()", equalTo(31))
                .body("days[0].isWeekend", equalTo(false)) // 2026-10-01 (Do)
                .body("days[2].isWeekend", equalTo(true))  // 2026-10-03 (Sa)
                .body("days[3].isWeekend", equalTo(true))  // 2026-10-04 (So)
                .extract().as(TimesheetMonthDTO.class);

        // Edit day 1
        TimesheetDayDTO day1 = month.getDays().get(0);
        day1.setStartTime("08:00");
        day1.setEndTime("17:00");
        day1.setPauseMinutes(60);
        day1.setComment("Integration Test");

        given()
                .contentType(ContentType.JSON)
                .body(month)
                .when().put("/api/timesheets/ResourceTestHours/2026/10")
                .then()
                .statusCode(200)
                .body("totalNetHours", equalTo(8.0f))
                .body("days[0].netHours", equalTo(8.0f))
                .body("days[0].comment", equalTo("Integration Test"));
    }

    @Test
    void testGetAndSaveMonthPersonDays() {
        TimesheetMonthDTO month = given()
                .when().get("/api/timesheets/ResourceTestDays/2026/10")
                .then()
                .statusCode(200)
                .body("projectName", equalTo("ResourceTestDays"))
                .body("template", equalTo("PersonDays"))
                .body("taskColumns", hasItems("TaskA", "TaskB"))
                .extract().as(TimesheetMonthDTO.class);

        TimesheetDayDTO day1 = month.getDays().get(0);
        day1.getTaskAllocations().put("TaskA", 0.5);
        day1.getTaskAllocations().put("TaskB", 0.5);
        day1.setNotes("- Feature complete");

        given()
                .contentType(ContentType.JSON)
                .body(month)
                .when().put("/api/timesheets/ResourceTestDays/2026/10")
                .then()
                .statusCode(200)
                .body("totalPt", equalTo(1.0f))
                .body("days[0].totalPt", equalTo(1.0f))
                .body("days[0].notes", equalTo("- Feature complete"));
    }
}
