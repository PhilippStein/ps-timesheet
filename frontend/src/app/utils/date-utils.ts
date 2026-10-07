export class DateUtils {
  static getGermanMonthName(month: number): string {
    const names = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return names[month - 1] || `Monat ${month}`;
  }
}
