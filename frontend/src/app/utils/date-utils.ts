export class DateUtils {
  static getGermanMonthName(month: number): string {
    const names = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return names[month - 1] || `Monat ${month}`;
  }

  static isDifferentWeek(dateStr1: string, dateStr2: string): boolean {
    if (!dateStr1 || !dateStr2) return false;
    const d1 = new Date(dateStr1 + 'T00:00:00');
    const d2 = new Date(dateStr2 + 'T00:00:00');
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;

    // ISO Day of week: 1 = Monday, ..., 7 = Sunday
    const day1 = d1.getDay() === 0 ? 7 : d1.getDay();
    const day2 = d2.getDay() === 0 ? 7 : d2.getDay();

    // Find Monday of each week
    const monday1 = new Date(d1);
    monday1.setDate(d1.getDate() - (day1 - 1));
    monday1.setHours(0, 0, 0, 0);

    const monday2 = new Date(d2);
    monday2.setDate(d2.getDate() - (day2 - 1));
    monday2.setHours(0, 0, 0, 0);

    return monday1.getTime() !== monday2.getTime();
  }
}
