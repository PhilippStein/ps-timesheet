package de.phstein.timesheet.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AppConfigServiceTest {

    private AppConfigService appConfigService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        appConfigService = new AppConfigService();
    }

    @Test
    void shouldCreateDefaultConfigIfMissing() {
        Path configFile = tempDir.resolve(".pstimesheet.yaml");
        appConfigService.setCustomConfigPathForTesting(configFile);

        AppConfig config = appConfigService.loadConfig();

        assertThat(config).isNotNull();
        assertThat(config.isHideEmptyWeekends()).isFalse();
        assertThat(config.getPdfExport()).isNotNull();
        assertThat(config.getPdfExport().getMarginTopMm()).isEqualTo(20.0);
        assertThat(config.getPdfExport().getMarginBottomMm()).isEqualTo(20.0);
        assertThat(config.getPdfExport().getMarginLeftMm()).isEqualTo(15.0);
        assertThat(config.getPdfExport().getMarginRightMm()).isEqualTo(15.0);
        assertThat(config.getPdfExport().getTemplatePdfPath()).isNull();
        assertThat(config.getProjects()).isEmpty();
        assertThat(Files.exists(configFile)).isTrue();
    }

    @Test
    void shouldLoadExistingYamlConfig() throws IOException {
        Path configFile = tempDir.resolve(".pstimesheet.yaml");
        String yamlContent = """
                pdfExport:
                  templatePdfPath: /tmp/stationery.pdf
                  marginTopMm: 35.0
                  marginBottomMm: 25.0
                  marginLeftMm: 12.0
                  marginRightMm: 12.0
                projects:
                  - name: CustomProject
                    basePath: /tmp/custom
                    template: PersonDays
                    hourlyRate: 95.0
                    dailyRate: 950.0
                    pdfHeaderTitle: "Custom Title"
                    pdfFooterText: "Thank you for your business"
                    defaultTasks:
                      - Feature
                      - Bugfix
                    defaultNotes:
                      - Daily
                      - Code Review
                    recurringNotes:
                      - text: Daily
                        days:
                          - Montag
                          - Dienstag
                          - Mittwoch
                          - Donnerstag
                          - Freitag
                      - text: SP Weekly
                        days:
                          - Mittwoch
                """;
        Files.writeString(configFile, yamlContent);
        appConfigService.setCustomConfigPathForTesting(configFile);

        AppConfig config = appConfigService.loadConfig();

        assertThat(config.getPdfExport()).isNotNull();
        assertThat(config.getPdfExport().getTemplatePdfPath()).isEqualTo("/tmp/stationery.pdf");
        assertThat(config.getPdfExport().getMarginTopMm()).isEqualTo(35.0);
        assertThat(config.getPdfExport().getMarginBottomMm()).isEqualTo(25.0);
        assertThat(config.getPdfExport().getMarginLeftMm()).isEqualTo(12.0);
        assertThat(config.getPdfExport().getMarginRightMm()).isEqualTo(12.0);

        assertThat(config.getProjects()).hasSize(1);
        ProjectConfig project = config.getProjects().get(0);
        assertThat(project.getName()).isEqualTo("CustomProject");
        assertThat(project.getBasePath()).isEqualTo("/tmp/custom");
        assertThat(project.getTemplate()).isEqualTo("PersonDays");
        assertThat(project.getHourlyRate()).isEqualTo(95.0);
        assertThat(project.getDailyRate()).isEqualTo(950.0);
        assertThat(project.getPdfHeaderTitle()).isEqualTo("Custom Title");
        assertThat(project.getPdfFooterText()).isEqualTo("Thank you for your business");
        assertThat(project.getDefaultTasks()).containsExactly("Feature", "Bugfix");
        assertThat(project.getDefaultNotes()).containsExactly("Daily", "Code Review");
        assertThat(project.getRecurringNotes()).hasSize(2);
        assertThat(project.getRecurringNotes().get(0).getText()).isEqualTo("Daily");
        assertThat(project.getRecurringNotes().get(0).getDays()).containsExactly("Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag");
        assertThat(project.getRecurringNotes().get(1).getText()).isEqualTo("SP Weekly");
        assertThat(project.getRecurringNotes().get(1).getDays()).containsExactly("Mittwoch");

        // Verify saving and re-reading preserves recurringNotes and defaultNotes
        appConfigService.saveConfig(config);
        AppConfig reloaded = appConfigService.loadConfig();
        ProjectConfig reloadedProj = reloaded.getProjects().get(0);
        assertThat(reloadedProj.getDefaultNotes()).containsExactly("Daily", "Code Review");
        assertThat(reloadedProj.getRecurringNotes()).hasSize(2);
        assertThat(reloadedProj.getRecurringNotes().get(0).getText()).isEqualTo("Daily");
    }

    @Test
    void shouldSaveAndLoadHideEmptyWeekendsSetting() {
        Path configFile = tempDir.resolve(".pstimesheet.yaml");
        appConfigService.setCustomConfigPathForTesting(configFile);
        AppConfig config = appConfigService.loadConfig();
        assertThat(config.isHideEmptyWeekends()).isFalse();

        config.setHideEmptyWeekends(true);
        appConfigService.saveConfig(config);

        AppConfig reloaded = appConfigService.loadConfig();
        assertThat(reloaded.isHideEmptyWeekends()).isTrue();
    }

    @Test
    void shouldNormalizeTemplateNames() {
        assertThat(ProjectConfig.normalizeTemplate("Temp1")).isEqualTo("WorkHours");
        assertThat(ProjectConfig.normalizeTemplate("WorkHours")).isEqualTo("WorkHours");
        assertThat(ProjectConfig.normalizeTemplate("Arbeitszeit")).isEqualTo("WorkHours");
        assertThat(ProjectConfig.normalizeTemplate("Temp2")).isEqualTo("PersonDays");
        assertThat(ProjectConfig.normalizeTemplate("PersonDays")).isEqualTo("PersonDays");
        assertThat(ProjectConfig.normalizeTemplate("Personentage")).isEqualTo("PersonDays");
    }

    @Test
    void shouldAddAndUpdateProject() {
        Path configFile = tempDir.resolve(".pstimesheet.yaml");
        appConfigService.setCustomConfigPathForTesting(configFile);
        appConfigService.loadConfig();

        ProjectConfig newProj = new ProjectConfig("NewProj", "/tmp/new", "Temp1", List.of());
        appConfigService.addOrUpdateProject(newProj);

        Optional<ProjectConfig> fetched = appConfigService.getProject("NewProj");
        assertThat(fetched).isPresent();
        assertThat(fetched.get().getTemplate()).isEqualTo("WorkHours");

        // Update project
        ProjectConfig updated = new ProjectConfig("NewProj", "/tmp/updated", "Temp2", List.of("Task1"));
        appConfigService.addOrUpdateProject(updated);

        Optional<ProjectConfig> refetched = appConfigService.getProject("NewProj");
        assertThat(refetched).isPresent();
        assertThat(refetched.get().getBasePath()).isEqualTo("/tmp/updated");
        assertThat(refetched.get().getTemplate()).isEqualTo("PersonDays");
        assertThat(refetched.get().getDefaultTasks()).containsExactly("Task1");
    }

    @Test
    void shouldDeleteProject() {
        Path configFile = tempDir.resolve(".pstimesheet.yaml");
        appConfigService.setCustomConfigPathForTesting(configFile);
        appConfigService.loadConfig();

        ProjectConfig project = new ProjectConfig("Blubb", "/tmp/blubb", "WorkHours", List.of());
        appConfigService.addOrUpdateProject(project);

        boolean deleted = appConfigService.deleteProject("Blubb");
        assertThat(deleted).isTrue();
        assertThat(appConfigService.getProject("Blubb")).isEmpty();

        boolean notFound = appConfigService.deleteProject("NonExistent");
        assertThat(notFound).isFalse();
    }

    @Test
    void shouldResolveTildeHomePath() {
        String userHome = System.getProperty("user.home");
        Path resolved = AppConfigService.resolvePath("~/timesheets/test");
        assertThat(resolved.toString()).isEqualTo(userHome + File.separator + "timesheets" + File.separator + "test");
    }
}
