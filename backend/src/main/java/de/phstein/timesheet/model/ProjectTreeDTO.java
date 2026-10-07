package de.phstein.timesheet.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProjectTreeDTO {

    private String projectName;
    private String basePath;
    private String template;
    private List<YearNodeDTO> years = new ArrayList<>();

    public ProjectTreeDTO() {
    }

    public ProjectTreeDTO(String projectName, String basePath, String template) {
        this.projectName = projectName;
        this.basePath = basePath;
        this.template = template;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public String getBasePath() {
        return basePath;
    }

    public void setBasePath(String basePath) {
        this.basePath = basePath;
    }

    public String getTemplate() {
        return template;
    }

    public void setTemplate(String template) {
        this.template = template;
    }

    public List<YearNodeDTO> getYears() {
        return years;
    }

    public void setYears(List<YearNodeDTO> years) {
        this.years = years != null ? new ArrayList<>(years) : new ArrayList<>();
    }
}
