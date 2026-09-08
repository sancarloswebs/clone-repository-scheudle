import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { isPaymentCategory, isCategoryForLine, type PaymentStatus, type TreasuryLine } from "@/lib/categories";
import { parseFlexibleDate } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import { toPaymentDTO } from "@/lib/payments";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function loadPayment(id: number) {
  const creator = db.select({ id: users.id, name: users.name }).from(users).as("creator");
  const payer = db.select({ id: users.id, name: users.name }).from(users).as("payer");

  const [row] = await db
    .select({
      payment: payments,
      createdByName: creator.name,
      paidByName: payer.name,
    })
    .from(payments)
    .innerJoin(creator, eq(payments.createdBy, creator.id))
    .leftJoin(payer, eq(payments.paidBy, payer.id))
    .where(eq(payments.id, id))
    .limit(1);

  return row ?? null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAdmin();
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    const lineParam = Number(new URL(request.url).searchParams.get("line") ?? "1");
    const line: TreasuryLine = lineParam === 2 ? 2 : 1;
    if (!Number.isInteger(id)) return json({ error: "ID inválido." }, 400);

    const existing = await loadPayment(id);
    if (!existing || existing.payment.line !== line) return json({ error: "Evento no encontrado en esta línea." }, 404);

    const body = (await request.json()) as {
      date?: string;
      amount?: string | number;
      category?: string;
      beneficiary?: string;
      description?: string;
      notes?: string;
      status?: string;
      currency?: string;
      foreignAmount?: string | number;
      exchangeRate?: string | number;
      exchangeRateSource?: string;
    };

    const nextDate = body.date ? parseFlexibleDate(body.date) : existing.payment.date;
    const nextAmount = body.amount != null ? parseAmount(String(body.amount)) : parseAmount(existing.payment.amount);
    const nextCategory = body.category ?? existing.payment.category;
    const nextCurrency = body.currency === "USD" ? "USD" : (body.currency ?? existing.payment.currency);
    const nextForeignAmount = body.foreignAmount != null ? parseAmount(String(body.foreignAmount)) : existing.payment.foreignAmount ? Number(existing.payment.foreignAmount) : null;
    const nextExchangeRate = body.exchangeRate != null ? parseAmount(String(body.exchangeRate)) : existing.payment.exchangeRate ? Number(existing.payment.exchangeRate) : null;

    if (!nextDate) return json({ error: "La fecha no es válida." }, 400);
    if (nextAmount == null || nextAmount < 0) return json({ error: "El importe no es válido." }, 400);
    if (!isPaymentCategory(nextCategory) || !isCategoryForLine(nextCategory, line)) return json({ error: "El evento no corresponde a la línea seleccionada." }, 400);

    const nextStatus: PaymentStatus =
      body.status === "pagado" || body.status === "pendiente"
        ? body.status
        : existing.payment.status === "pagado"
          ? "pagado"
          : "pendiente";

    const wasPaid = existing.payment.status === "pagado";
    const nowPaid = nextStatus === "pagado";

    await db
      .update(payments)
      .set({
        date: nextDate,
        amount: nextAmount.toFixed(2),
        category: nextCategory,
        currency: nextCurrency,
        foreignAmount: nextForeignAmount != null ? nextForeignAmount.toFixed(4) : null,
        exchangeRate: nextExchangeRate != null ? nextExchangeRate.toFixed(4) : null,
        exchangeRateSource: body.exchangeRateSource ?? existing.payment.exchangeRateSource,
        beneficiary: body.beneficiary ?? existing.payment.beneficiary,
        description: body.description ?? existing.payment.description,
        notes: body.notes ?? existing.payment.notes,
        status: nextStatus,
        paidAt: nowPaid ? (wasPaid ? existing.payment.paidAt : new Date()) : null,
        paidBy: nowPaid ? (wasPaid ? existing.payment.paidBy : user.id) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, id)));

    const updated = await loadPayment(id);
    if (!updated) return json({ error: "No se pudo actualizar." }, 500);
    return json({ payment: toPaymentDTO(updated.payment, updated.createdByName, updated.paidByName) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    const lineParam = Number(new URL(_request.url).searchParams.get("line") ?? "1");
    const line: TreasuryLine = lineParam === 2 ? 2 : 1;
    if (!Number.isInteger(id)) return json({ error: "ID inválido." }, 400);

    const existing = await loadPayment(id);
    if (!existing || existing.payment.line !== line) return json({ error: "Evento no encontrado en esta línea." }, 404);

    await db.delete(payments).where(eq(payments.id, id));
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
