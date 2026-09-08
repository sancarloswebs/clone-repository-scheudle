import { PAYMENT_CATEGORIES, isIncomeCategory } from "@/lib/categories";
import { addDaysISO, getPaymentWeeksInMonth, normalizeDateString } from "@/lib/dates";
import { toNumber, trafficLevel } from "@/lib/money";
import type { AppSettings, CategoryBreakdown, DaySummary, PaymentDTO, WeekSummary } from "@/lib/types";

function emptyBreakdown(): CategoryBreakdown[] {
  return PAYMENT_CATEGORIES.map((category) => ({
    category,
    total: 0,
    pending: 0,
    paid: 0,
  }));
}

function paymentDate(item: PaymentDTO): string {
  return normalizeDateString(item.date);
}

function signedAmount(item: PaymentDTO): number {
  const amount = toNumber(item.amount);
  return isIncomeCategory(item.category) ? amount : -amount;
}

export function buildWeekSummaries(
  allPayments: PaymentDTO[],
  year: number,
  monthIndex: number,
  settings: AppSettings,
): WeekSummary[] {
  const weeks = getPaymentWeeksInMonth(year, monthIndex);
  const greenMax = toNumber(settings.greenMax);
  const yellowMax = toNumber(settings.yellowMax);
  const weeklyCap = toNumber(settings.weeklyCap);

  return weeks.map((week) => {
    const own = allPayments.filter((item) => {
      const date = paymentDate(item);
      return date >= week.startISO && date <= week.endISO;
    });
    const carryover = allPayments.filter((item) => item.status === "pendiente" && paymentDate(item) < week.startISO);
    const pendingAgainstCap = [...carryover, ...own.filter((item) => item.status === "pendiente")].sort((a, b) =>
      paymentDate(a).localeCompare(paymentDate(b)),
    );

    const days: DaySummary[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const iso = addDaysISO(week.startISO, offset);
      const dayPayments = own.filter((item) => paymentDate(item) === iso);
      days.push({
        date: iso,
        total: dayPayments.reduce((sum, item) => sum + signedAmount(item), 0),
        pending: dayPayments
          .filter((item) => item.status === "pendiente")
          .reduce((sum, item) => sum + signedAmount(item), 0),
        paid: dayPayments
          .filter((item) => item.status === "pagado")
          .reduce((sum, item) => sum + signedAmount(item), 0),
        payments: dayPayments,
      });
    }

    const breakdown = emptyBreakdown();
    for (const item of own) {
      const bucket = breakdown.find((entry) => entry.category === item.category);
      if (!bucket) continue;
      const amount = toNumber(item.amount);
      bucket.total += amount;
      if (item.status === "pendiente") bucket.pending += amount;
      else bucket.paid += amount;
    }

    const ownExpenseTotal = own.filter((item) => !isIncomeCategory(item.category)).reduce((sum, item) => sum + toNumber(item.amount), 0);
    const ownIncomeTotal = own.filter((item) => isIncomeCategory(item.category)).reduce((sum, item) => sum + toNumber(item.amount), 0);
    const ownTotal = ownIncomeTotal - ownExpenseTotal;
    const ownPending = own
      .filter((item) => item.status === "pendiente")
      .reduce((sum, item) => sum + signedAmount(item), 0);
    const ownPaid = own
      .filter((item) => item.status === "pagado")
      .reduce((sum, item) => sum + signedAmount(item), 0);
    const carryoverTotal = carryover.reduce((sum, item) => sum + signedAmount(item), 0);
    const effectiveTotal = ownTotal + carryoverTotal;

    return {
      weekNo: week.weekNo,
      startISO: week.startISO,
      endISO: week.endISO,
      year: week.year,
      month: week.month,
      ownTotal,
      ownExpenseTotal,
      ownIncomeTotal,
      ownPending,
      ownPaid,
      carryoverTotal,
      carryoverCount: carryover.length,
      effectiveTotal,
      vsCap: effectiveTotal - weeklyCap,
      traffic: trafficLevel(effectiveTotal, greenMax, yellowMax),
      days,
      breakdown: breakdown.filter((item) => item.total > 0),
      carryover,
      rolledFriday: [],
      pendingAgainstCap,
    };
  });
}
