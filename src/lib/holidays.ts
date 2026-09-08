import { pad2 } from "@/lib/dates";

export type Holiday = {
  date: string;
  name: string;
};

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function toISO(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function addUtcDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * 24 * 60 * 60 * 1000);
}

function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

function transferIfNeeded(year: number, month: number, day: number): string {
  const date = utcDate(year, month, day);
  const weekday = date.getUTCDay();
  if (weekday === 2) return toISO(addUtcDays(date, -1));
  if (weekday === 3 || weekday === 4 || weekday === 5) return toISO(addUtcDays(date, (8 - weekday) % 7));
  return toISO(date);
}

export function getArgentinaHolidays(year: number): Holiday[] {
  const easter = easterDate(year);
  const holidays: Holiday[] = [
    { date: toISO(utcDate(year, 1, 1)), name: "Año Nuevo" },
    { date: toISO(addUtcDays(easter, -48)), name: "Carnaval" },
    { date: toISO(addUtcDays(easter, -47)), name: "Carnaval" },
    { date: toISO(utcDate(year, 3, 24)), name: "Día Nacional de la Memoria" },
    { date: toISO(utcDate(year, 4, 2)), name: "Día del Veterano y de Malvinas" },
    { date: toISO(addUtcDays(easter, -2)), name: "Viernes Santo" },
    { date: toISO(utcDate(year, 5, 1)), name: "Día del Trabajador" },
    { date: toISO(utcDate(year, 5, 25)), name: "Revolución de Mayo" },
    { date: transferIfNeeded(year, 6, 17), name: "Paso a la Inmortalidad de Güemes" },
    { date: toISO(utcDate(year, 6, 20)), name: "Día de la Bandera" },
    { date: toISO(utcDate(year, 7, 9)), name: "Día de la Independencia" },
    { date: transferIfNeeded(year, 8, 17), name: "Paso a la Inmortalidad de San Martín" },
    { date: transferIfNeeded(year, 10, 12), name: "Día del Respeto a la Diversidad Cultural" },
    { date: transferIfNeeded(year, 11, 20), name: "Día de la Soberanía Nacional" },
    { date: toISO(utcDate(year, 12, 8)), name: "Inmaculada Concepción" },
    { date: toISO(utcDate(year, 12, 25)), name: "Navidad" },
  ];

  const unique = new Map<string, Holiday>();
  for (const holiday of holidays) unique.set(holiday.date, holiday);
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getHoliday(iso: string): Holiday | null {
  const year = Number(iso.slice(0, 4));
  if (!Number.isInteger(year)) return null;
  return getArgentinaHolidays(year).find((item) => item.date === iso) ?? null;
}
