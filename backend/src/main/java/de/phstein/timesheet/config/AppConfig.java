package de.phstein.timesheet.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AppConfig {

    private List<ProjectConfig> projects = new ArrayList<>();
    private boolean hideEmptyWeekends = false;

    public AppConfig() {
    }

    public AppConfig(List<ProjectConfig> projects) {
        if (projects != null) {
            this.projects = new ArrayList<>(projects);
        }
    }

    public AppConfig(List<ProjectConfig> projects, boolean hideEmptyWeekends) {
        if (projects != null) {
            this.projects = new ArrayList<>(projects);
        }
        this.hideEmptyWeekends = hideEmptyWeekends;
    }

    public List<ProjectConfig> getProjects() {
        return projects;
    }

    public void setProjects(List<ProjectConfig> projects) {
        this.projects = projects != null ? new ArrayList<>(projects) : new ArrayList<>();
    }

    public boolean isHideEmptyWeekends() {
        return hideEmptyWeekends;
    }

    public void setHideEmptyWeekends(boolean hideEmptyWeekends) {
        this.hideEmptyWeekends = hideEmptyWeekends;
    }
}
