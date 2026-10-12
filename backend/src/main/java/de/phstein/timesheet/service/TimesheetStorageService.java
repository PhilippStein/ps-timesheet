package de.phstein.timesheet.service;

import de.phstein.timesheet.config.AppConfigService;
import de.phstein.timesheet.config.ProjectConfig;
import de.phstein.timesheet.model.MonthNodeDTO;
import de.phstein.timesheet.model.ProjectTreeDTO;
import de.phstein.timesheet.model.TimesheetMonthDTO;
import de.phstein.timesheet.model.YearNodeDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@ApplicationScoped
public class TimesheetStorageService {

    private static final Pattern CSV_PATTERN = Pattern.compile("^(\\d{4})_(\\d{2})_.*\\.csv$", Pattern.CASE_INSENSITIVE);
    private static final Pattern YEAR_DIR_PATTERN = Pattern.compile("^\\d{4}$");

    @Inject
    CsvWorkHoursHandler workHoursHandler;

    @Inject
    CsvPersonDaysHandler personDaysHandler;

    public TimesheetTemplateHandler getHandler(String template) {
        String normalized = ProjectConfig.normalizeTemplate(template);
        if (CsvPersonDaysHandler.TEMPLATE_NAME.equalsIgnoreCase(normalized)) {
            return personDaysHandler;
        }
        return workHoursHandler;
    }

    public ProjectTreeDTO getProjectTree(ProjectConfig project) {
        Path basePath = AppConfigService.resolvePath(project.getBasePath());
        ProjectTreeDTO tree = new ProjectTreeDTO(project.getName(), project.getBasePath(), project.getTemplate());

        List<YearNodeDTO> yearNodes = new ArrayList<>();
        int currentYear = LocalDate.now().getYear();

        if (Files.exists(basePath) && Files.isDirectory(basePath)) {
            try (DirectoryStream<Path> yearDirs = Files.newDirectoryStream(basePath)) {
                for (Path dir : yearDirs) {
                    if (Files.isDirectory(dir)) {
                        String dirName = dir.getFileName().toString();
                        if (YEAR_DIR_PATTERN.matcher(dirName).matches()) {
                            try {
                                int year = Integer.parseInt(dirName);
                                YearNodeDTO yearNode = scanYearDirectory(dir, year);
                                yearNodes.add(yearNode);
                            } catch (NumberFormatException ignored) {
                            }
                        }
                    }
                }
            } catch (IOException e) {
                throw new RuntimeException("Failed to scan project directory: " + basePath, e);
            }
        }

        // If current year is not present in existing folders, add it as a candidate
        boolean hasCurrentYear = yearNodes.stream().anyMatch(y -> y.getYear() == currentYear);
        if (!hasCurrentYear) {
            YearNodeDTO currentYearNode = new YearNodeDTO(currentYear);
            for (int m = 1; m <= 12; m++) {
                currentYearNode.getMonths().add(new MonthNodeDTO(m, DateUtils.getGermanMonthName(m), false, null));
            }
            yearNodes.add(currentYearNode);
        }

        yearNodes.sort(Comparator.comparingInt(YearNodeDTO::getYear).reversed());
        tree.setYears(yearNodes);
        return tree;
    }

    private YearNodeDTO scanYearDirectory(Path yearDir, int year) {
        YearNodeDTO yearNode = new YearNodeDTO(year);
        List<MonthNodeDTO> months = new ArrayList<>(12);

        for (int m = 1; m <= 12; m++) {
            months.add(new MonthNodeDTO(m, DateUtils.getGermanMonthName(m), false, null));
        }

        try (DirectoryStream<Path> files = Files.newDirectoryStream(yearDir, "*.csv")) {
            for (Path file : files) {
                String fileName = file.getFileName().toString();
                Matcher matcher = CSV_PATTERN.matcher(fileName);
                if (matcher.matches()) {
                    int fileYear = Integer.parseInt(matcher.group(1));
                    int fileMonth = Integer.parseInt(matcher.group(2));
                    if (fileYear == year && fileMonth >= 1 && fileMonth <= 12) {
                        MonthNodeDTO monthNode = months.get(fileMonth - 1);
                        monthNode.setExists(true);
                        monthNode.setFileName(fileName);
                    }
                }
            }
        } catch (IOException ignored) {
        }

        yearNode.setMonths(months);
        return yearNode;
    }

    public Path resolveCsvPath(ProjectConfig project, int year, int month) {
        Path basePath = AppConfigService.resolvePath(project.getBasePath());
        String templateName = ProjectConfig.normalizeTemplate(project.getTemplate());
        String monthPadded = String.format("%02d", month);
        String fileName = String.format("%d_%s_%s_%s.csv", year, monthPadded, project.getName(), templateName);
        return basePath.resolve(String.valueOf(year)).resolve(fileName);
    }

    public synchronized TimesheetMonthDTO loadOrCreateMonth(ProjectConfig project, int year, int month) {
        Path csvPath = resolveCsvPath(project, year, month);
        TimesheetTemplateHandler handler = getHandler(project.getTemplate());

        if (!Files.exists(csvPath)) {
            // Check if there is another CSV for this year/month (e.g. with different template name)
            Path yearDir = csvPath.getParent();
            Path existingCsv = findExistingCsvForMonth(yearDir, year, month);

            if (existingCsv != null && Files.exists(existingCsv)) {
                return handler.readMonth(existingCsv, project.getName(), year, month);
            }

            // Create initial empty month and write to file
            TimesheetMonthDTO newMonth = handler.createEmptyMonth(project.getName(), year, month, project.getDefaultTasks());
            saveMonthAtomic(csvPath, newMonth, handler);
            return newMonth;
        }

        return handler.readMonth(csvPath, project.getName(), year, month);
    }

    public synchronized TimesheetMonthDTO loadMonthForStats(ProjectConfig project, int year, int month) {
        Path csvPath = resolveCsvPath(project, year, month);
        TimesheetTemplateHandler handler = getHandler(project.getTemplate());

        if (Files.exists(csvPath)) {
            return handler.readMonth(csvPath, project.getName(), year, month);
        }

        Path yearDir = csvPath.getParent();
        Path existingCsv = findExistingCsvForMonth(yearDir, year, month);
        if (existingCsv != null && Files.exists(existingCsv)) {
            return handler.readMonth(existingCsv, project.getName(), year, month);
        }

        return handler.createEmptyMonth(project.getName(), year, month, project.getDefaultTasks());
    }

    public synchronized TimesheetMonthDTO saveMonth(ProjectConfig project, int year, int month, TimesheetMonthDTO monthData) {
        Path csvPath = resolveCsvPath(project, year, month);
        TimesheetTemplateHandler handler = getHandler(project.getTemplate());

        saveMonthAtomic(csvPath, monthData, handler);
        return handler.readMonth(csvPath, project.getName(), year, month);
    }

    private void saveMonthAtomic(Path csvPath, TimesheetMonthDTO monthData, TimesheetTemplateHandler handler) {
        try {
            if (csvPath.getParent() != null) {
                Files.createDirectories(csvPath.getParent());
            }

            Path tempFile = csvPath.resolveSibling("." + csvPath.getFileName().toString() + ".tmp");
            handler.writeMonth(tempFile, monthData);

            try {
                Files.move(tempFile, csvPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException e) {
                Files.move(tempFile, csvPath, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to save timesheet CSV atomically: " + csvPath, e);
        }
    }

    private Path findExistingCsvForMonth(Path yearDir, int year, int month) {
        if (yearDir == null || !Files.exists(yearDir)) {
            return null;
        }
        String prefix = String.format("%d_%02d_", year, month);
        try (DirectoryStream<Path> files = Files.newDirectoryStream(yearDir, "*.csv")) {
            for (Path file : files) {
                if (file.getFileName().toString().startsWith(prefix)) {
                    return file;
                }
            }
        } catch (IOException ignored) {
        }
        return null;
    }
}
