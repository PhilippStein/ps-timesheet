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
        assertThat(config.getProjects()).hasSize(2);
        assertThat(config.getProjects().get(0).getName()).isEqualTo("Blubb");
        assertThat(config.getProjects().get(0).getTemplate()).isEqualTo("WorkHours");
        assertThat(config.getProjects().get(1).getName()).isEqualTo("ProjectAlpha");
        assertThat(config.getProjects().get(1).getTemplate()).isEqualTo("PersonDays");
        assertThat(config.getProjects().get(1).getDefaultTasks()).containsExactly("Konzeption", "Entwicklung", "Review & Test");
        assertThat(Files.exists(configFile)).isTrue();
    }

    @Test
    void shouldLoadExistingYamlConfig() throws IOException {
        Path configFile = tempDir.resolve(".pstimesheet.yaml");
        String yamlContent = """
                projects:
                  - name: CustomProject
                    basePath: /tmp/custom
                    template: PersonDays
                    defaultTasks:
                      - Feature
                      - Bugfix
                """;
        Files.writeString(configFile, yamlContent);
        appConfigService.setCustomConfigPathForTesting(configFile);

        AppConfig config = appConfigService.loadConfig();

        assertThat(config.getProjects()).hasSize(1);
        ProjectConfig project = config.getProjects().get(0);
        assertThat(project.getName()).isEqualTo("CustomProject");
        assertThat(project.getBasePath()).isEqualTo("/tmp/custom");
        assertThat(project.getTemplate()).isEqualTo("PersonDays");
        assertThat(project.getDefaultTasks()).containsExactly("Feature", "Bugfix");
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
