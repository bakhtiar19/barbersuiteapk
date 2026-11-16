import {
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export function getLocalDateString(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) {
    return format(new Date(), 'yyyy-MM-dd');
  }
  return format(date, 'yyyy-MM-dd');
}

export function formatDateId(dateInput: string | Date): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? parseFlexibleDate(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'd MMM yyyy', { locale: idLocale });
}

export function formatDateTimeId(iso: string): string {
  if (!iso) return '-';
  const date = parseISO(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'd MMM yyyy, HH:mm', { locale: idLocale });
}

export function formatShortDateId(dateStr: string): string {
  if (!dateStr) return '-';
  const date = parseFlexibleDate(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'd MMM', { locale: idLocale });
}

export function formatMonthShortId(yearMonth: string): string {
  if (!yearMonth) return '-';
  const [y, m] = yearMonth.split('-').map(Number);
  const date = new Date(y || 2026, (m || 1) - 1, 1);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'MMM yy', { locale: idLocale });
}

export function formatBackupFilenameDate(date: Date = new Date()): string {
  return format(date, 'yyyyMMdd-HHmm');
}

export function parseFlexibleDate(input: string): Date {
  if (!input) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return parseISO(input);
}

export function getDaysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const parsed = parseISO(iso);
    if (Number.isNaN(parsed.getTime())) return null;
    return Math.max(0, differenceInCalendarDays(new Date(), parsed));
  } catch {
    return null;
  }
}

export function getWeeksSince(iso: string | null | undefined): number {
  const days = getDaysSince(iso);
  if (days === null) return 0;
  return Math.max(1, Math.floor(days / 7));
}

export function getLastNDaysKeys(days: number, endDate: Date = new Date()): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    result.push(getLocalDateString(subDays(endDate, i)));
  }
  return result;
}

export function getLastNMonthsKeys(months: number, endDate: Date = new Date()): string[] {
  const result: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    result.push(format(subMonths(endDate, i), 'yyyy-MM'));
  }
  return result;
}

export type ReportPeriodPreset = 'daily' | 'weekly' | 'monthly' | 'custom';

export function getRangeForPreset(
  preset: Exclude<ReportPeriodPreset, 'custom'>,
  weekStartsOn: 0 | 1 = 1,
  anchor: Date = new Date(),
): { from: string; to: string } {
  if (preset === 'daily') {
    const today = getLocalDateString(anchor);
    return { from: today, to: today };
  }
  if (preset === 'weekly') {
    const start = startOfWeek(anchor, { weekStartsOn });
    const end = endOfWeek(anchor, { weekStartsOn });
    return {
      from: getLocalDateString(start),
      to: getLocalDateString(end),
    };
  }
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  return {
    from: getLocalDateString(start),
    to: getLocalDateString(end),
  };
}
