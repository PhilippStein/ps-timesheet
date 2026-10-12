package de.phstein.timesheet.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TimesheetDayDTO {

    private String date; // "yyyy-MM-dd"
    private String dayOfWeek; // "Montag", "Dienstag", etc.

    @JsonProperty("isWeekend")
    @JsonAlias({"weekend", "isWeekend"})
    private boolean isWeekend;

    @JsonProperty("status")
    private DayStatus status; // e.g. URLAUB, KRANK

    // WorkHours fields
    private String startTime; // "HH:mm"
    private String endTime; // "HH:mm"
    private Integer pauseMinutes;
    private String comment;
    private Double netHours; // Computed on the fly

    // PersonDays fields
    private String location; // "Remote", "Vor-Ort", "Urlaub", "Krank"
    private Map<String, Double> taskAllocations = new HashMap<>(); // taskName -> PT
    private String notes; // Multiline bulletpoints
    private List<String> notesList = new ArrayList<>();
    private Double totalPt; // Computed on the fly

    public TimesheetDayDTO() {
    }

    public TimesheetDayDTO(String date, String dayOfWeek, boolean isWeekend) {
        this.date = date;
        this.dayOfWeek = dayOfWeek;
        this.isWeekend = isWeekend;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(String dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    @JsonProperty("isWeekend")
    public boolean isWeekend() {
        return isWeekend;
    }

    @JsonProperty("isWeekend")
    public void setWeekend(boolean weekend) {
        isWeekend = weekend;
    }

    public DayStatus getStatus() {
        return status;
    }

    public void setStatus(DayStatus status) {
        this.status = status;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public Integer getPauseMinutes() {
        return pauseMinutes;
    }

    public void setPauseMinutes(Integer pauseMinutes) {
        this.pauseMinutes = pauseMinutes;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public Double getNetHours() {
        return netHours;
    }

    public void setNetHours(Double netHours) {
        this.netHours = netHours;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Map<String, Double> getTaskAllocations() {
        return taskAllocations;
    }

    public void setTaskAllocations(Map<String, Double> taskAllocations) {
        this.taskAllocations = taskAllocations != null ? taskAllocations : new HashMap<>();
    }

    public String getNotes() {
        if ((notes == null || notes.isBlank()) && notesList != null && !notesList.isEmpty()) {
            return formatNotesList(notesList);
        }
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
        this.notesList = parseNotesToList(notes);
    }

    public List<String> getNotesList() {
        if ((notesList == null || notesList.isEmpty()) && notes != null && !notes.isBlank()) {
            notesList = parseNotesToList(notes);
        }
        return notesList != null ? notesList : new ArrayList<>();
    }

    public void setNotesList(List<String> notesList) {
        this.notesList = notesList != null ? new ArrayList<>(notesList) : new ArrayList<>();
        this.notes = formatNotesList(this.notesList);
    }

    public static List<String> parseNotesToList(String notes) {
        List<String> list = new ArrayList<>();
        if (notes == null || notes.isBlank()) {
            return list;
        }
        String[] lines = notes.split("\\r?\\n");
        for (String line : lines) {
            if (line == null) continue;
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            trimmed = trimmed.replaceFirst("^[\\-\\*\u2022\\+]\\s*", "").trim();
            if (!trimmed.isEmpty()) {
                list.add(trimmed);
            }
        }
        return list;
    }

    public static String formatNotesList(List<String> notesList) {
        if (notesList == null || notesList.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (String item : notesList) {
            if (item != null && !item.isBlank()) {
                if (sb.length() > 0) {
                    sb.append("\n");
                }
                sb.append("- ").append(item.trim());
            }
        }
        return sb.length() > 0 ? sb.toString() : null;
    }

    public boolean isVacation() {
        if (status == DayStatus.URLAUB) {
            return true;
        }
        return location != null && location.equalsIgnoreCase("Urlaub");
    }

    public boolean isSick() {
        if (status == DayStatus.KRANK) {
            return true;
        }
        return location != null && location.equalsIgnoreCase("Krank");
    }

    public boolean isHoliday() {
        if (status == DayStatus.FEIERTAG) {
            return true;
        }
        return location != null && location.equalsIgnoreCase("Feiertag");
    }

    public boolean isVacationOrSick() {
        return isVacation() || isSick() || isHoliday();
    }

    public boolean isWeekendDay() {
        if (isWeekend) {
            return true;
        }
        if (dayOfWeek != null) {
            String dow = dayOfWeek.trim().toLowerCase();
            if (dow.contains("samstag") || dow.contains("sonntag") || dow.contains("saturday") || dow.contains("sunday")) {
                return true;
            }
        }
        return false;
    }

    public boolean isWorkDay() {
        return !isWeekendDay() && !isVacationOrSick();
    }

    public Double getTotalPt() {
        return totalPt;
    }

    public void setTotalPt(Double totalPt) {
        this.totalPt = totalPt;
    }
}
