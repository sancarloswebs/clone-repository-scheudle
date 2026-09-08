"use client";

import { CATEGORY_META, isIncomeCategory, isLine1CollectedCategory } from "@/lib/categories";
import { WEEK_DAY_FULL, getCalendarCells, todayISO } from "@/lib/dates";
import { getHoliday } from "@/lib/holidays";
import { formatARS, toNumber } from "@/lib/money";
import type { PaymentDTO, WeekSummary } from "@/lib/types";

type Props = {
  year: number;
  monthIndex: number;
  payments: PaymentDTO[];
  weeks: WeekSummary[];
  selectedDate: string | null;
  onSelectDate: (iso: string) => void;
  onOpenPayment: (payment: PaymentDTO) => void;
};

export function MonthCalendar({
  year,
  monthIndex,
  payments,
  weeks,
  selectedDate,
  onSelectDate,
  onOpenPayment,
}: Props) {
  const cells = getCalendarCells(year, monthIndex);
  const today = todayISO();
  const rows: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[#101826]/80">
      <div className="grid grid-cols-7 border-b border-white/8 bg-[#182233] text-[11px] tracking-[0.12em] text-slate-400 uppercase">
        {WEEK_DAY_FULL.map((day) => (
          <div key={day} className="px-1 py-2 text-[10px] sm:px-3 sm:py-3 sm:text-[11px]">
            <span className="sm:hidden">{day.slice(0, 3)}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1">
        {rows.map((row) => {
          const week = weeks.find((item) => item.startISO === row[0]?.iso);
          return (
            <div key={row[0]?.iso} className="grid grid-cols-7 border-b border-white/6 last:border-b-0">
              {row.map((cell) => {
                const dayPayments = payments.filter((item) => item.date === cell.iso);
                const visible = dayPayments.slice(0, 3);
                const extra = dayPayments.length - visible.length;
                const isToday = cell.iso === today;
                const isSelected = cell.iso === selectedDate;
                const holiday = getHoliday(cell.iso);
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    title={holiday?.name}
                    onClick={() => onSelectDate(cell.iso)}
                    className={`min-h-[92px] border-r border-white/6 p-1.5 text-left last:border-r-0 sm:min-h-[132px] sm:p-2 ${
                      cell.inMonth ? "bg-transparent" : "bg-black/20"
                    } ${isSelected ? "bg-white/6" : "hover:bg-white/3"} ${holiday ? "bg-[rgba(244,114,182,0.08)]" : ""}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm ${
                          isToday
                            ? "bg-[var(--teal)] font-semibold text-[#06231b]"
                            : holiday
                              ? "bg-pink-400/30 font-semibold text-pink-100"
                              : cell.inMonth
                                ? "text-white"
                                : "text-slate-600"
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>
                      {dayPayments.length > 0 ? (
                        <span className="text-[10px] text-slate-400">{formatARS(Math.abs(dayPayments.reduce((sum, item) => sum + (isIncomeCategory(item.category) ? toNumber(item.amount) : -toNumber(item.amount)), 0)), { compact: true })}</span>
                      ) : null}
                    </div>
                    {holiday ? <p className="mb-1 truncate text-[10px] text-pink-200/90"><span className="text-sm">🎉</span> {holiday.name}</p> : null}
                    <div className="space-y-1">
                      {visible.map((item) => {
                        const meta = CATEGORY_META[item.category];
                        return (
                          <span
                            key={item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenPayment(item);
                            }}
                            className="chip block truncate rounded-md px-1.5 py-1 text-[11px]"
                            style={{ ["--chip" as string]: meta.color }}
                          >
                            <span className={`block leading-4 ${item.status === "pendiente" ? "opacity-90" : "opacity-70"}`}>
                              <span className="block truncate font-semibold">
                                {item.beneficiary || meta.short}
                              </span>
                              <span className="block truncate text-[10px] font-semibold text-slate-200">({formatARS(Math.abs(toNumber(item.amount)), { compact: true })})</span>
                              <span className="block truncate text-[10px] text-slate-300">{item.category}</span>
                            </span>
                          </span>
                        );
                      })}
                      {extra > 0 ? (
                        <span className="block rounded-md bg-white/8 px-1.5 py-1 text-[11px] text-slate-300">+{extra}</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
              {week ? (
                <span className="sr-only">
                  Semana {week.weekNo} {week.traffic}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
