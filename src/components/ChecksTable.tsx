"use client";

import { FormEvent, useEffect, useState } from "react";
import { isCheckCategory } from "@/lib/categories";
import { formatDisplayDate } from "@/lib/dates";
import { getHoliday } from "@/lib/holidays";
import { formatARS, formatPlain, parseAmount, toNumber } from "@/lib/money";
import type { PaymentDTO, WeekSummary } from "@/lib/types";

type Props = {
  weeks: WeekSummary[];
  cap: string;
  readOnly?: boolean;
  onEditPayment: (payment: PaymentDTO) => void;
  onDeletePayment: (payment: PaymentDTO) => void;
  onSaveCap: (value: string) => Promise<void>;
};

function weekChecks(week: WeekSummary) {
  return [...week.days.flatMap((day) => day.payments), ...week.rolledFriday].filter((item) =>
    isCheckCategory(item.category),
  );
}

export function ChecksTable({ weeks, cap, readOnly = false, onEditPayment, onDeletePayment, onSaveCap }: Props) {
  const [capDraft, setCapDraft] = useState(formatPlain(cap));
  const [saving, setSaving] = useState(false);
  const monthTotal = weeks.reduce((sum, week) => sum + week.ownTotal, 0);
  const monthPending = weeks.reduce((sum, week) => sum + week.ownPending + week.carryoverTotal, 0);

  useEffect(() => {
    setCapDraft(formatPlain(cap));
  }, [cap]);

  async function saveCap(event: FormEvent) {
    event.preventDefault();
    const parsed = parseAmount(capDraft);
    if (parsed == null || parsed < 0) return;
    setSaving(true);
    try {
      await onSaveCap(parsed.toFixed(2));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="fade-up w-full overflow-hidden rounded-[24px] border border-cyan-400/20 bg-[#101826]/80">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-[10px] tracking-[0.16em] text-cyan-200 uppercase">Apartado de cheques</p>
          <h2 className="text-lg text-white">Cheques físicos y electrónicos</h2>
          <p className="mt-1 text-sm text-slate-400">
            En el mes {formatARS(Math.abs(monthTotal), { compact: true })} · Pendiente {formatARS(Math.abs(monthPending), { compact: true })}
          </p>
        </div>
        {!readOnly ? (
          <form onSubmit={saveCap} className="flex flex-wrap items-end gap-2 text-sm">
            <label className="text-slate-300">
              Tope semanal de cheques
              <input
                value={capDraft}
                onChange={(event) => setCapDraft(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-cyan-400/20 bg-white/5 px-3 py-2 text-white outline-none sm:w-44"
              />
            </label>
            <button type="submit" disabled={saving} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-[#062027] disabled:opacity-60">
              {saving ? "Guardando..." : "Guardar tope"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-cyan-100">Tope {formatARS(cap)}</p>
        )}
      </div>

      <div className="space-y-3 p-3">
        {weeks.map((week) => {
          const checks = weekChecks(week);
          const físicos = checks.filter((item) => item.category === "Cheques Físicos").reduce((sum, item) => sum + toNumber(item.amount), 0);
          const electronicos = checks.filter((item) => item.category === "Cheques Electrónicos").reduce((sum, item) => sum + toNumber(item.amount), 0);
          return (
            <article key={week.startISO} className="overflow-hidden rounded-2xl bg-white/4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
                <div>
                  <p className="text-lg font-semibold text-white">Semana {week.weekNo}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                    {físicos > 0 ? <span>Físico {formatARS(físicos)}</span> : null}
                    {electronicos > 0 ? <span>Electrónico {formatARS(electronicos)}</span> : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatARS(Math.abs(week.effectiveTotal), { compact: true })}</p>
                  <p className={`text-[11px] ${week.vsCap > 0 ? "text-rose-300" : "text-emerald-300"}`}>
                    {week.vsCap > 0 ? `+${formatARS(week.vsCap, { compact: true })}` : formatARS(Math.abs(week.vsCap), { compact: true })}
                  </p>
                </div>
              </div>
              {checks.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-600">Sin cheques esta semana</p>
              ) : (
                <div className="divide-y divide-white/6">
                  {checks.map((payment) => {
                    const holiday = getHoliday(payment.date);
                    return (
                      <div key={payment.id} className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-[120px_1fr_160px_90px_110px_auto] sm:items-center">
                        <p className={`text-sm ${holiday ? "text-pink-200" : "text-slate-300"}`}>
                          {formatDisplayDate(payment.date)}{holiday ? <span className="ml-1 text-sm">🎉</span> : ""}
                        </p>
                        <div>
                          <p className="font-semibold text-white">{payment.beneficiary || payment.category} <span className="text-slate-300">({formatARS(Math.abs(toNumber(payment.amount)), { compact: true })})</span></p>
                          <p className={`text-xs ${payment.category === "Cheques Físicos" ? "text-lime-300" : "text-violet-300"}`}>
                            {payment.category === "Cheques Físicos" ? "Físico" : "Electrónico"}
                          </p>
                        </div>
                        <p className={`text-sm font-semibold ${payment.status === "pagado" ? "status-pagado" : "status-pendiente"}`}>{payment.status}</p>
                        <p className="text-sm font-semibold text-white sm:text-right">{formatARS(Math.abs(toNumber(payment.amount)))}</p>
                        {!readOnly ? (
                          <div className="col-span-2 flex gap-3 text-xs sm:col-span-1 sm:justify-end">
                            <button type="button" className="text-slate-300" onClick={() => onEditPayment(payment)}>Editar</button>
                            <button type="button" className="text-rose-300" onClick={() => onDeletePayment(payment)}>Borrar</button>
                          </div>
                        ) : <span />}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
