"use client";

import { WEEK_DAY_LABELS, formatShortDate, isFridayISO, todayISO, weekContainsToday } from "@/lib/dates";
import { getHoliday } from "@/lib/holidays";
import { formatARS } from "@/lib/money";
import { isLine1CollectedCategory } from "@/lib/categories";
import type { PaymentDTO, WeekSummary } from "@/lib/types";

type Props = {
  weeks: WeekSummary[];
  selectedWeekStarts: string[];
  onToggleWeek: (startISO: string) => void;
  onAddDay: (iso: string) => void;
  onEditPayment: (payment: PaymentDTO) => void;
  onDeletePayment: (payment: PaymentDTO) => void;
  readOnly?: boolean;
};

export function WeeklyTable({
  weeks,
  selectedWeekStarts,
  onToggleWeek,
  onAddDay,
  onEditPayment,
  onDeletePayment,
  readOnly = false,
}: Props) {
  const today = todayISO();

  return (
    <>
    <div className="space-y-3 lg:hidden">
      {weeks.map((week) => {
        const selected = selectedWeekStarts.includes(week.startISO);
        return (
          <article
            key={week.startISO}
            className={`traffic-${week.traffic} rounded-2xl border border-white/10 bg-[#101826] p-3`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleWeek(week.startISO)}
                  className="accent-[var(--gold)]"
                />
                <div>
                  <p className="text-lg font-semibold text-white">Semana {week.weekNo}</p>
                  {weekContainsToday(week.startISO, week.endISO, today) ? (
                    <p className="text-[10px] tracking-wide text-[var(--teal)] uppercase">Actual</p>
                  ) : null}
                </div>
              </label>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{formatARS(Math.abs(week.effectiveTotal), { compact: true })}</p>
                <p className={`text-[11px] ${week.vsCap > 0 ? "text-rose-300" : "text-emerald-300"}`}>
                  {week.vsCap > 0 ? `+${formatARS(week.vsCap, { compact: true })}` : formatARS(Math.abs(week.vsCap), { compact: true })}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {week.days.map((day) => {
                const friday = isFridayISO(day.date);
                const holiday = getHoliday(day.date);
                return (
                  <div
                    key={day.date}
                    onClick={() => {
                      if (!readOnly) onAddDay(day.date);
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-left ${
                      holiday ? "bg-pink-400/10" : friday ? "bg-[#2a2316]" : "bg-white/4"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`text-xs font-semibold ${holiday ? "text-pink-200" : friday ? "text-[var(--gold)]" : "text-slate-300"}`}>
                        {WEEK_DAY_LABELS[week.days.indexOf(day)]} {formatShortDate(day.date)}
                        {holiday ? <span className="ml-1 text-base">🎉</span> : ""}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {day.total !== 0 ? formatARS(Math.abs(day.total), { compact: true }) : "$0"}
                      </span>
                    </div>
                    {holiday ? <p className="mb-1 text-[10px] text-pink-200">{holiday.name}</p> : null}
                    <div className="space-y-1">
                      {day.payments.map((payment) => (
                        <PaymentChip
                          key={payment.id}
                          payment={payment}
                          onEdit={onEditPayment}
                          onDelete={onDeletePayment}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
    <div className="hidden w-full overflow-hidden rounded-[24px] border border-[var(--line)] bg-[#101826]/80 lg:block">
      <table className="w-full table-fixed border-collapse text-xs">
        <thead className="bg-[#182233] text-left text-[10px] tracking-[0.12em] text-[var(--gold-2)] uppercase">
          <tr>
            <th className="w-[72px] px-2 py-2">Sem.</th>
            {WEEK_DAY_LABELS.map((label, index) => (
              <th key={label} className={`px-1.5 py-2 ${index === 0 ? "bg-[#3a2e18] text-[var(--gold)]" : ""}`}>
                {label}
              </th>
            ))}
            <th className="w-[92px] px-2 py-2 text-right">Total Semanal<br/><span className="text-[8px] normal-case tracking-normal text-slate-500">gastos / cobros</span></th>
            <th className="w-[80px] px-2 py-2 text-right">Arrastre</th>
            <th className="w-[110px] px-2 py-2 text-right">Vs tope</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => {
            const selected = selectedWeekStarts.includes(week.startISO);
            return (
              <tr
                key={week.startISO}
                className={`traffic-${week.traffic} border-t border-white/8 align-top ${
                  selected ? "bg-white/6" : "hover:bg-white/3"
                }`}
              >
                <td className="px-2 py-2">
                  <label className="flex cursor-pointer items-start gap-1.5">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleWeek(week.startISO)}
                      className="mt-1 accent-[var(--gold)]"
                    />
                    <div className="text-lg font-semibold text-white">{week.weekNo}</div>
                  </label>
                  {weekContainsToday(week.startISO, week.endISO, today) ? (
                    <div className="text-[9px] tracking-wide text-[var(--teal)] uppercase">Actual</div>
                  ) : null}
                </td>
                {week.days.map((day) => {
                  const friday = isFridayISO(day.date);
                  const holiday = getHoliday(day.date);
                  return (
                    <td
                      key={day.date}
                      title={holiday?.name}
                      className={`cursor-pointer px-1.5 py-2 ${friday && !holiday ? "bg-[#2a2316]" : ""} ${
                        day.date === today ? "bg-[rgba(62,224,178,0.08)]" : ""
                      } ${holiday ? "bg-[rgba(244,114,182,0.07)]" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!readOnly) onAddDay(day.date);
                      }}
                    >
                      <div className={`mb-0.5 text-[10px] ${holiday ? "font-semibold text-pink-200" : friday ? "font-semibold text-[var(--gold)]" : "text-slate-500"}`}>
                        {formatShortDate(day.date)}{holiday ? <span className="ml-0.5 text-sm">🎉</span> : ""}
                        {holiday ? <span className="mt-0.5 block truncate text-[9px] font-normal">{holiday.name}</span> : null}
                      </div>
                      <div className="text-[11px] font-semibold text-white">
                        {day.total !== 0 ? formatARS(Math.abs(day.total), { compact: true }) : <span className="font-normal text-slate-600">$0</span>}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {day.payments.map((payment) => (
                          <PaymentChip
                            key={payment.id}
                            payment={payment}
                            onEdit={onEditPayment}
                            onDelete={onDeletePayment}
                            readOnly={readOnly}
                          />
                        ))}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right">
                  <div className="text-[12px] font-semibold text-white">{formatARS(Math.abs(week.ownExpenseTotal), { compact: true })}</div><div className="mt-1 border-t border-white/10 pt-1 text-[11px] font-semibold text-emerald-300">{formatARS(Math.abs(week.ownIncomeTotal), { compact: true })}</div>
                </td>
                <td className="px-2 py-2 text-right text-orange-200">
                  {week.carryoverTotal !== 0 ? formatARS(Math.abs(week.carryoverTotal), { compact: true }) : "—"}
                </td>
                <td className="px-2 py-2 text-right">
                  <span className={`text-[12px] font-semibold ${week.vsCap > 0 ? "text-rose-300" : "text-emerald-300"}`}>
                    {week.vsCap > 0 ? `+${formatARS(week.vsCap, { compact: true })}` : formatARS(Math.abs(week.vsCap), { compact: true })}
                  </span>
                  {week.pendingAgainstCap.length > 0 ? (
                    <div className="mt-1 text-left text-[9px] leading-3 text-amber-100">
                      {week.pendingAgainstCap.map((item) => (
                        <p key={item.id}>
                          {formatShortDate(item.date)} {formatARS(Math.abs(Number(item.amount)), { compact: true })}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {weeks.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-400">No hay semanas para este mes.</p>
      ) : null}
    </div>
    </>
  );
}

function PaymentChip({
  payment,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  payment: PaymentDTO;
  onEdit: (payment: PaymentDTO) => void;
  onDelete: (payment: PaymentDTO) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded bg-black/25 px-1 py-0.5">
      <button
        type="button"
        className="block w-full text-left"
        onClick={(event) => {
          event.stopPropagation();
          onEdit(payment);
        }}
      >
        <span className="block truncate text-[10px] font-semibold text-white">
          {payment.beneficiary || payment.category}
        </span>
        <span className="block truncate text-[9px] font-semibold text-slate-200">({formatARS(Math.abs(Number(payment.amount)), { compact: true })})</span>
        <span className="block truncate text-[9px] text-slate-400">{payment.category}</span>
      </button>
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold ${payment.status === "pagado" ? "status-pagado" : "status-pendiente"}`}>
          {payment.status === "pagado" && isLine1CollectedCategory(payment.category) ? "cobrado" : payment.status}
        </span>
        {!readOnly ? (
          <button
            type="button"
            className="text-[9px] text-rose-300"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(payment);
            }}
          >
            Borrar
          </button>
        ) : null}
      </div>
    </div>
  );
}
