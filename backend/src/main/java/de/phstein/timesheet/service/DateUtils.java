package de.phstein.timesheet.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public final class DateUtils {

    public static final DateTimeFormatter ISO_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private DateUtils() {
    }

    public static String getGermanDayOfWeek(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        return switch (dow) {
            case MONDAY -> "Montag";
            case TUESDAY -> "Dienstag";
            case WEDNESDAY -> "Mittwoch";
            case THURSDAY -> "Donnerstag";
            case FRIDAY -> "Freitag";
            case SATURDAY -> "Samstag";
            case SUNDAY -> "Sonntag";
        };
    }

    public static boolean isWeekend(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        return dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY;
    }

    public static String getGermanMonthName(int month) {
        return switch (month) {
            case 1 -> "Januar";
            case 2 -> "Februar";
            case 3 -> "März";
            case 4 -> "April";
            case 5 -> "Mai";
            case 6 -> "Juni";
            case 7 -> "Juli";
            case 8 -> "August";
            case 9 -> "September";
            case 10 -> "Oktober";
            case 11 -> "November";
            case 12 -> "Dezember";
            default -> "Monat " + month;
        };
    }

    public static int getDaysInMonth(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        return ym.lengthOfMonth();
    }
}
