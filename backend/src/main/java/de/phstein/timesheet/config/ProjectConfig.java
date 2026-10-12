package de.phstein.timesheet.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProjectConfig {

    private String name;
    private String basePath;
    private String template; // "WorkHours" or "PersonDays"
    private List<String> defaultTasks = new ArrayList<>();
    private List<String> defaultNotes = new ArrayList<>();
    private List<RecurringNoteConfig> recurringNotes = new ArrayList<>();
    private String pdfHeaderTitle;
    private String pdfFooterText;
    private Double hourlyRate;
    private Double dailyRate;

    public ProjectConfig() {
    }

    public ProjectConfig(String name, String basePath, String template, List<String> defaultTasks) {
        this.name = name;
        this.basePath = basePath;
        this.template = normalizeTemplate(template);
        if (defaultTasks != null) {
            this.defaultTasks = new ArrayList<>(defaultTasks);
        }
    }

    public ProjectConfig(String name, String basePath, String template, List<String> defaultTasks, List<String> defaultNotes, List<RecurringNoteConfig> recurringNotes) {
        this.name = name;
        this.basePath = basePath;
        this.template = normalizeTemplate(template);
        if (defaultTasks != null) {
            this.defaultTasks = new ArrayList<>(defaultTasks);
        }
        if (defaultNotes != null) {
            this.defaultNotes = new ArrayList<>(defaultNotes);
        }
        if (recurringNotes != null) {
            this.recurringNotes = new ArrayList<>(recurringNotes);
        }
    }

    public static String normalizeTemplate(String template) {
        if (template == null) {
            return "WorkHours";
        }
        if ("Temp1".equalsIgnoreCase(template) || "WorkHours".equalsIgnoreCase(template) || "Arbeitszeit".equalsIgnoreCase(template)) {
            return "WorkHours";
        }
        if ("Temp2".equalsIgnoreCase(template) || "PersonDays".equalsIgnoreCase(template) || "Personentage".equalsIgnoreCase(template)) {
            return "PersonDays";
        }
        return template;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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
        this.template = normalizeTemplate(template);
    }

    public List<String> getDefaultTasks() {
        return defaultTasks;
    }

    public void setDefaultTasks(List<String> defaultTasks) {
        this.defaultTasks = defaultTasks != null ? new ArrayList<>(defaultTasks) : new ArrayList<>();
    }

    public List<String> getDefaultNotes() {
        return defaultNotes;
    }

    public void setDefaultNotes(List<String> defaultNotes) {
        this.defaultNotes = defaultNotes != null ? new ArrayList<>(defaultNotes) : new ArrayList<>();
    }

    public List<RecurringNoteConfig> getRecurringNotes() {
        return recurringNotes;
    }

    public void setRecurringNotes(List<RecurringNoteConfig> recurringNotes) {
        this.recurringNotes = recurringNotes != null ? new ArrayList<>(recurringNotes) : new ArrayList<>();
    }

    public String getPdfHeaderTitle() {
        return pdfHeaderTitle;
    }

    public void setPdfHeaderTitle(String pdfHeaderTitle) {
        this.pdfHeaderTitle = pdfHeaderTitle;
    }

    public String getPdfFooterText() {
        return pdfFooterText;
    }

    public void setPdfFooterText(String pdfFooterText) {
        this.pdfFooterText = pdfFooterText;
    }

    public Double getHourlyRate() {
        return hourlyRate;
    }

    public void setHourlyRate(Double hourlyRate) {
        this.hourlyRate = hourlyRate;
    }

    public Double getDailyRate() {
        return dailyRate;
    }

    public void setDailyRate(Double dailyRate) {
        this.dailyRate = dailyRate;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ProjectConfig that = (ProjectConfig) o;
        return Objects.equals(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }
}
