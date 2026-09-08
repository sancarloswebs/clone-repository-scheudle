export const WEEK_DAY_LABELS = ["Vie", "Sáb", "Dom", "Lun", "Mar", "Mié", "Jue"] as const;
export const WEEK_DAY_FULL = [
  "Viernes",
  "Sábado",
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
] as const;

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

export function startOfPaymentWeek(date: Date): Date {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = normalized.getDay();
  const daysSinceFriday = (day + 2) % 7;
  return addDays(normalized, -daysSinceFriday);
}

export function endOfPaymentWeek(date: Date): Date {
  return addDays(startOfPaymentWeek(date), 6);
}

export function formatDisplayDate(value: string): string {
  const date = parseISODate(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function formatShortDate(value: string): string {
  const date = parseISODate(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function parseFlexibleDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return toISODate(date);
  }

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(trimmed);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return toISODate(date);
  }

  const excelSerial = Number(trimmed);
  if (Number.isInteger(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
    const excelEpoch = new Date(1899, 11, 30);
    return toISODate(addDays(excelEpoch, excelSerial));
  }

  return null;
}

export type PaymentWeek = {
  weekNo: number;
  start: Date;
  end: Date;
  startISO: string;
  endISO: string;
  year: number;
  month: number;
};

export function getPaymentWeeksInMonth(year: number, monthIndex: number): PaymentWeek[] {
  const firstISO = `${year}-${pad2(monthIndex + 1)}-01`;
  const lastUTC = new Date(Date.UTC(year, monthIndex + 1, 0));
  const lastISO = `${lastUTC.getUTCFullYear()}-${pad2(lastUTC.getUTCMonth() + 1)}-${pad2(lastUTC.getUTCDate())}`;
  let cursorISO = startOfPaymentWeekISO(firstISO);
  const weeks: PaymentWeek[] = [];
  let weekNo = 1;

  while (cursorISO <= lastISO) {
    const endISO = addDaysISO(cursorISO, 6);
    if (endISO >= firstISO && cursorISO <= lastISO) {
      weeks.push({
        weekNo,
        start: parseISODate(cursorISO),
        end: parseISODate(endISO),
        startISO: cursorISO,
        endISO,
        year,
        month: monthIndex + 1,
      });
      weekNo += 1;
    }
    cursorISO = addDaysISO(cursorISO, 7);
  }

  return weeks;
}

export function getCalendarCells(year: number, monthIndex: number): Array<{
  iso: string;
  inMonth: boolean;
  date: Date;
}> {
  const firstISO = `${year}-${pad2(monthIndex + 1)}-01`;
  const lastUTC = new Date(Date.UTC(year, monthIndex + 1, 0));
  const lastISO = `${lastUTC.getUTCFullYear()}-${pad2(lastUTC.getUTCMonth() + 1)}-${pad2(lastUTC.getUTCDate())}`;
  let cursorISO = startOfPaymentWeekISO(firstISO);
  const endISO = addDaysISO(startOfPaymentWeekISO(lastISO), 6);
  const cells: Array<{ iso: string; inMonth: boolean; date: Date }> = [];

  while (cursorISO <= endISO) {
    const date = parseISODate(cursorISO);
    cells.push({
      iso: cursorISO,
      inMonth: date.getMonth() === monthIndex,
      date,
    });
    cursorISO = addDaysISO(cursorISO, 1);
  }

  return cells;
}

export function shiftMonth(year: number, monthIndex: number, delta: number): { year: number; monthIndex: number } {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function weekContainsToday(startISO: string, endISO: string, today = todayISO()): boolean {
  return today >= startISO && today <= endISO;
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function addDaysISO(iso: string, amount: number): string {
  const [year, month, day] = normalizeDateString(iso).split("-").map(Number);
  const utc = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + amount));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
}

export function weekdayUTC(iso: string): number {
  const [year, month, day] = normalizeDateString(iso).split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1)).getUTCDay();
}

export function startOfPaymentWeekISO(iso: string): string {
  const daysSinceFriday = (weekdayUTC(iso) + 2) % 7;
  return addDaysISO(iso, -daysSinceFriday);
}

export function isFridayISO(iso: string): boolean {
  return weekdayUTC(iso) === 5;
}

export function normalizeDateString(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const raw = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return parseFlexibleDate(raw) ?? "";
}

export function weekdayFromFriday(iso: string): number {
  return (weekdayUTC(iso) + 2) % 7;
}
