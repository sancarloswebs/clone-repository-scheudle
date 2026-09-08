"use client";

import { CATEGORY_META, PAYMENT_CATEGORIES, isIncomeCategory } from "@/lib/categories";
import { formatDisplayDate } from "@/lib/dates";
import { formatARS, toNumber } from "@/lib/money";
import type { PaymentDTO, WeekSummary } from "@/lib/types";

function buildStats(items: PaymentDTO[]) {
  const signed = (item: PaymentDTO) => isIncomeCategory(item.category) ? toNumber(item.amount) : -toNumber(item.amount);
  const total = items.reduce((sum, item) => sum + signed(item), 0);
  const pending = items
    .filter((item) => item.status === "pendiente")
    .reduce((sum, item) => sum + signed(item), 0);
  const paid = total - pending;
  const breakdown = PAYMENT_CATEGORIES.map((category) => ({
    category,
    total: items.filter((item) => item.category === category).reduce((sum, item) => sum + signed(item), 0),
  })).filter((item) => item.total > 0);

  return { total, pending, paid, count: items.length, breakdown };
}

export function PeriodSummaries({
  selectedWeeks,
  last15,
  last30,
}: {
  selectedWeeks: { weeks: WeekSummary[]; payments: PaymentDTO[] };
  last15: { from: string; to: string; payments: PaymentDTO[] };
  last30: { from: string; to: string; payments: PaymentDTO[] };
}) {
  const cards = [
    {
      title: selectedWeeks.weeks.length ? `Semanas ${selectedWeeks.weeks.map((week) => week.weekNo).join(", ")}` : "Semanas",
      subtitle: selectedWeeks.weeks.length
        ? selectedWeeks.weeks.map((week) => `${formatDisplayDate(week.startISO)} – ${formatDisplayDate(week.endISO)}`).join(" · ")
        : "Marcá semanas en la tabla",
      payments: selectedWeeks.payments,
    },
    {
      title: "Últimos 15 días",
      subtitle: `${formatDisplayDate(last15.from)} al ${formatDisplayDate(last15.to)}`,
      payments: last15.payments,
    },
    {
      title: "Últimos 30 días",
      subtitle: `${formatDisplayDate(last30.from)} al ${formatDisplayDate(last30.to)}`,
      payments: last30.payments,
    },
  ];

  return (
    <section className="mt-6 space-y-3">
      <div>
        <p className="text-[10px] tracking-[0.16em] text-[var(--gold)] uppercase">Resúmenes</p>
        <h2 className="text-xl text-white">Totales rápidos</h2>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {cards.map((card) => {
          const stats = buildStats(card.payments);
          return (
            <article key={card.title} className="hover-lift rounded-[24px] border border-[var(--line)] bg-[#101826]/85 p-5">
              <p className="text-sm font-semibold text-white">{card.title}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{card.subtitle}</p>
              <p className="mt-4 text-[1.7rem] leading-none font-semibold text-white">{formatARS(Math.abs(stats.total))}</p>
              <div className="mt-4 flex gap-2">
                <span className="rounded-full bg-emerald-400/12 px-3 py-1 text-xs text-emerald-200">
                  Pagado {formatARS(Math.abs(stats.paid), { compact: true })}
                </span>
                <span className="rounded-full bg-amber-400/12 px-3 py-1 text-xs text-amber-200">
                  Pendiente {formatARS(Math.abs(stats.pending), { compact: true })}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">{stats.count} {stats.count === 1 ? "movimiento" : "movimientos"}</p>
              <div className="mt-3 space-y-1.5">
                {stats.breakdown.map((item) => (
                  <div key={item.category} className="flex items-center justify-between text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-slate-300">
                      <i
                        className="dot-pulse h-2 w-2 shrink-0 rounded-full"
                        style={{ background: CATEGORY_META[item.category].color, ["--dot" as string]: CATEGORY_META[item.category].color }}
                      />
                      <span className="truncate">{item.category}</span>
                    </span>
                    <span className="ml-3 shrink-0 text-white">{formatARS(Math.abs(item.total), { compact: true })}</span>
                  </div>
                ))}
                {stats.breakdown.length === 0 ? <p className="text-xs text-slate-600">Sin movimientos.</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
