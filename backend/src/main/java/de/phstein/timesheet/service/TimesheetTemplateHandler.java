package de.phstein.timesheet.service;

import de.phstein.timesheet.model.TimesheetMonthDTO;

import java.nio.file.Path;
import java.util.List;

public interface TimesheetTemplateHandler {

    String getTemplateName();

    TimesheetMonthDTO createEmptyMonth(String projectName, int year, int month, List<String> defaultTasks);

    TimesheetMonthDTO readMonth(Path csvFile, String projectName, int year, int month);

    void writeMonth(Path csvFile, TimesheetMonthDTO month);
}
