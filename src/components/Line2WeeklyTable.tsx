"use client";

import { WEEK_DAY_FULL, formatShortDate, isFridayISO, todayISO, weekContainsToday } from "@/lib/dates";
import { getHoliday } from "@/lib/holidays";
import { formatARS } from "@/lib/money";
import { isIncomeCategory } from "@/lib/categories";
import type { PaymentDTO, WeekSummary } from "@/lib/types";

type Props = {
  week: WeekSummary | null;
  readOnly?: boolean;
  onAddDay: (iso: string) => void;
  onEditPayment: (p: PaymentDTO) => void;
  onDeletePayment: (p: PaymentDTO) => void;
};

export function Line2WeeklyTable({ week, readOnly, onAddDay, onEditPayment, onDeletePayment }: Props) {
  const today = todayISO();

  if (!week) {
    return <div className="rounded-[28px] border border-[var(--line)] bg-[#101826]/80 p-8 text-center text-sm text-slate-400">No hay una semana seleccionada.</div>;
  }

  const expenses = Math.abs(week.ownExpenseTotal);
  const income = Math.abs(week.ownIncomeTotal);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[#101826]/85 shadow-2xl">
      <div className="grid grid-cols-2 gap-3 border-b border-white/8 bg-[#182233] p-4 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-2">
          <p className="text-xs tracking-[0.14em] text-[var(--gold-2)] uppercase">Vista semanal · Línea 2</p>
          <p className="mt-1 text-xl font-semibold text-white">{formatShortDate(week.startISO)} – {formatShortDate(week.endISO)}</p>
          {weekContainsToday(week.startISO, week.endISO, today) ? <p className="mt-1 text-xs font-semibold tracking-wide text-[var(--teal)] uppercase">Semana actual</p> : null}
        </div>
        <div className="rounded-2xl bg-rose-300/8 px-3 py-2 text-right">
          <p className="text-[10px] tracking-[0.12em] text-rose-200 uppercase">Gastos</p>
          <p className="mt-1 text-lg font-semibold text-rose-100">{formatARS(expenses)}</p>
        </div>
        <div className="rounded-2xl bg-emerald-300/8 px-3 py-2 text-right">
          <p className="text-[10px] tracking-[0.12em] text-emerald-200 uppercase">Ingresos</p>
          <p className="mt-1 text-lg font-semibold text-emerald-100">{formatARS(income)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[1120px] grid-cols-7 divide-x divide-white/8">
          {week.days.map((day, index) => {
            const holiday = getHoliday(day.date);
            const dayIncome = Math.abs(day.payments.filter((p) => isIncomeCategory(p.category)).reduce((sum, p) => sum + Number(p.amount), 0));
            const dayExpense = Math.abs(day.payments.filter((p) => !isIncomeCategory(p.category)).reduce((sum, p) => sum + Number(p.amount), 0));
            return (
              <div key={day.date} className={`min-h-[520px] ${isFridayISO(day.date) ? "bg-[#2a2316]/60" : "bg-[#101826]"}`}>
                <button type="button" disabled={readOnly} onClick={() => onAddDay(day.date)} className="w-full border-b border-white/8 p-3 text-left hover:bg-white/5 disabled:cursor-default">
                  <div className="text-[10px] tracking-[0.14em] text-slate-500 uppercase">{WEEK_DAY_FULL[index]}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-base font-semibold ${day.date === today ? "bg-[var(--teal)] text-[#06231b]" : "text-white"}`}>{formatShortDate(day.date).slice(0, 2)}</span>
                    <span className="text-[10px] text-slate-500">{holiday ? "Feriado" : ""}</span>
                  </div>
                  {holiday ? <p className="mt-1 truncate text-[10px] text-pink-200">🎉 {holiday.name}</p> : null}
                  <div className="mt-2 space-y-0.5 text-[10px]"><span className="text-rose-200">G {formatARS(dayExpense, { compact: true })}</span><span className="ml-2 text-emerald-200">I {formatARS(dayIncome, { compact: true })}</span></div>
                </button>

                <div className="space-y-2 p-2">
                  {day.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`line2-payment-card line2-payment-${isIncomeCategory(payment.category) ? "income" : "expense"} rounded-xl border border-white/8 bg-black/20 p-2`}
                    >
                      <span
                        className={`line2-flow-icon ${isIncomeCategory(payment.category) ? "line2-flow-income" : "line2-flow-expense"}`}
                        aria-label={isIncomeCategory(payment.category) ? "Entrada de dinero" : "Salida de dinero"}
                        title={isIncomeCategory(payment.category) ? "Entrada · Cobro" : "Salida · Pago"}
                      >
                        {isIncomeCategory(payment.category) ? "↑" : "↓"}
                      </span>
                      <button type="button" onClick={() => onEditPayment(payment)} className="w-full text-left pr-7">
                        <p className="truncate text-[15px] font-semibold leading-5 text-white">{payment.beneficiary || payment.category}</p>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-200">({formatARS(Math.abs(Number(payment.amount)), { compact: true })})</p>
                        <p className="mt-1 truncate text-[11px] text-slate-400">{payment.category}</p>
                        {(payment.category === "Pago en dólares" || payment.category === "Cobro en dólares") && payment.foreignAmount != null ? (
                          <p className="mt-1 text-base font-bold tracking-wide text-pink-300">USD {Number(payment.foreignAmount).toLocaleString("es-AR", { useGrouping: true, minimumFractionDigits: 0, maximumFractionDigits: 4 })}</p>
                        ) : null}
                        <p className={`mt-1 text-[15px] font-bold leading-5 ${
                          payment.status === "pagado"
                            ? (isIncomeCategory(payment.category) ? "text-emerald-400" : "text-red-500")
                            : "text-orange-400"
                        }`}>{formatARS(Math.abs(Number(payment.amount)))}</p>
                        <p className={`mt-1 text-[11px] font-semibold tracking-wide ${
                          payment.status === "pagado"
                            ? (isIncomeCategory(payment.category) ? "text-emerald-400" : "text-white")
                            : "text-orange-400"
                        }`}>{payment.status === "pagado" ? (isIncomeCategory(payment.category) ? "Cobrado" : "Pagado") : "Pendiente"}</p>
                      </button>
                      {!readOnly ? <button type="button" onClick={() => onDeletePayment(payment)} className="mt-2 text-[10px] text-rose-300">Borrar</button> : null}
                    </div>
                  ))}
                  <button type="button" disabled={readOnly} onClick={() => onAddDay(day.date)} className="min-h-16 w-full rounded-xl border border-dashed border-white/8 text-xs text-slate-600 transition-all duration-200 hover:border-[var(--teal)]/40 hover:bg-white/[0.03] hover:text-slate-300 disabled:cursor-default">+ Nuevo movimiento</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
