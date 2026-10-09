package de.phstein.timesheet.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.File;
import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class AppConfigService {

    private final ObjectMapper yamlMapper;
    private Path activeConfigPath;
    private AppConfig cachedConfig;

    @ConfigProperty(name = "timesheet.config.path", defaultValue = "")
    Optional<String> customConfigPath;

    public AppConfigService() {
        YAMLFactory yamlFactory = new YAMLFactory()
                .disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER)
                .enable(YAMLGenerator.Feature.MINIMIZE_QUOTES);
        this.yamlMapper = new ObjectMapper(yamlFactory);
    }

    @PostConstruct
    public void init() {
        this.activeConfigPath = determineConfigPath();
        loadConfig();
    }

    public synchronized Path determineConfigPath() {
        // 1. Explicit property / environment variable
        String envOverride = System.getenv("PSTIMESHEET_CONFIG_PATH");
        if (envOverride != null && !envOverride.isBlank()) {
            return resolvePath(envOverride);
        }
        if (customConfigPath != null && customConfigPath.isPresent() && !customConfigPath.get().isBlank()) {
            return resolvePath(customConfigPath.get());
        }

        String userHome = System.getProperty("user.home");
        Path homePath = Paths.get(userHome);

        // 2. Check for existing files in order of preference
        Path yamlPath = homePath.resolve(".pstimesheet.yaml");
        if (Files.exists(yamlPath)) {
            return yamlPath;
        }

        Path ymlPath = homePath.resolve(".pstimesheet.yml");
        if (Files.exists(ymlPath)) {
            return ymlPath;
        }

        Path configPath = homePath.resolve(".pstimesheet.config");
        if (Files.exists(configPath)) {
            return configPath;
        }

        // Default path to create if none exists
        return yamlPath;
    }

    public static Path resolvePath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            return Paths.get(".");
        }
        String expanded = rawPath;
        if (rawPath.startsWith("~" + File.separator) || rawPath.equals("~")) {
            expanded = System.getProperty("user.home") + rawPath.substring(1);
        } else if (rawPath.startsWith("~/")) {
            expanded = System.getProperty("user.home") + rawPath.substring(1);
        }
        return Paths.get(expanded).toAbsolutePath().normalize();
    }

    public synchronized AppConfig loadConfig() {
        if (activeConfigPath == null) {
            activeConfigPath = determineConfigPath();
        }

        if (!Files.exists(activeConfigPath)) {
            this.cachedConfig = new AppConfig();
            saveConfig(this.cachedConfig);
            return this.cachedConfig;
        }

        try {
            this.cachedConfig = yamlMapper.readValue(activeConfigPath.toFile(), AppConfig.class);
            if (this.cachedConfig == null) {
                this.cachedConfig = new AppConfig();
            }
            if (this.cachedConfig.getProjects() == null) {
                this.cachedConfig.setProjects(new ArrayList<>());
            }
            return this.cachedConfig;
        } catch (IOException e) {
            throw new RuntimeException("Failed to read configuration from " + activeConfigPath, e);
        }
    }

    public synchronized void saveConfig(AppConfig config) {
        if (config == null) {
            throw new IllegalArgumentException("Config cannot be null");
        }
        if (activeConfigPath == null) {
            activeConfigPath = determineConfigPath();
        }

        try {
            if (activeConfigPath.getParent() != null) {
                Files.createDirectories(activeConfigPath.getParent());
            }

            Path tempFile = activeConfigPath.resolveSibling("." + activeConfigPath.getFileName().toString() + ".tmp");
            yamlMapper.writeValue(tempFile.toFile(), config);

            try {
                Files.move(tempFile, activeConfigPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException e) {
                Files.move(tempFile, activeConfigPath, StandardCopyOption.REPLACE_EXISTING);
            }

            this.cachedConfig = config;
        } catch (IOException e) {
            throw new RuntimeException("Failed to save configuration to " + activeConfigPath, e);
        }
    }

    public synchronized AppConfig getConfig() {
        if (cachedConfig == null) {
            return loadConfig();
        }
        return cachedConfig;
    }

    public synchronized List<ProjectConfig> getProjects() {
        return new ArrayList<>(getConfig().getProjects());
    }

    public synchronized Optional<ProjectConfig> getProject(String name) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        return getConfig().getProjects().stream()
                .filter(p -> name.equalsIgnoreCase(p.getName()))
                .findFirst();
    }

    public synchronized ProjectConfig addOrUpdateProject(ProjectConfig project) {
        if (project == null || project.getName() == null || project.getName().isBlank()) {
            throw new IllegalArgumentException("Project name is required");
        }
        if (project.getBasePath() == null || project.getBasePath().isBlank()) {
            throw new IllegalArgumentException("Project base path is required");
        }
        project.setTemplate(ProjectConfig.normalizeTemplate(project.getTemplate()));

        AppConfig config = getConfig();
        List<ProjectConfig> projects = new ArrayList<>(config.getProjects());

        int existingIndex = -1;
        for (int i = 0; i < projects.size(); i++) {
            if (projects.get(i).getName().equalsIgnoreCase(project.getName())) {
                existingIndex = i;
                break;
            }
        }

        if (existingIndex >= 0) {
            projects.set(existingIndex, project);
        } else {
            projects.add(project);
        }

        config.setProjects(projects);
        saveConfig(config);
        return project;
    }

    public synchronized boolean deleteProject(String name) {
        if (name == null || name.isBlank()) {
            return false;
        }
        AppConfig config = getConfig();
        List<ProjectConfig> projects = new ArrayList<>(config.getProjects());
        boolean removed = projects.removeIf(p -> name.equalsIgnoreCase(p.getName()));
        if (removed) {
            config.setProjects(projects);
            saveConfig(config);
        }
        return removed;
    }

    public Path getActiveConfigPath() {
        return activeConfigPath;
    }

    public void setCustomConfigPathForTesting(Path path) {
        this.activeConfigPath = path;
    }
}
