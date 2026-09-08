import { errorResponse, json } from "@/lib/api";
import { getActor } from "@/lib/actor";
import { requireAdmin } from "@/lib/auth";
import { PAYMENT_CATEGORIES, isPaymentCategory, isCategoryForLine, type PaymentCategory, type PaymentStatus, type TreasuryLine } from "@/lib/categories";
import { pad2, parseFlexibleDate } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import { listPayments, toPaymentDTO } from "@/lib/payments";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await getActor();
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;
    const statusParam = url.searchParams.get("status");
    const categoryParam = url.searchParams.get("category");
    const lineParam = Number(url.searchParams.get("line") ?? "1");
    const line: TreasuryLine = lineParam === 2 ? 2 : 1;

    const status = statusParam === "pendiente" || statusParam === "pagado" ? statusParam : undefined;
    const category = categoryParam && isPaymentCategory(categoryParam) ? categoryParam : undefined;

    const items = await listPayments({ from, to, status, category, line });
    return json({ payments: items });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const body = (await request.json()) as {
      date?: string;
      amount?: string | number;
      category?: string;
      beneficiary?: string;
      description?: string;
      notes?: string;
      status?: string;
      line?: number;
      currency?: string;
      foreignAmount?: string | number;
      exchangeRate?: string | number;
      exchangeRateSource?: string;
    };

    const date = parseFlexibleDate(body.date ?? "");
    const amount = parseAmount(String(body.amount ?? ""));
    const category = body.category ?? "";
    const line: TreasuryLine = body.line === 2 ? 2 : 1;
    const currency = body.currency === "USD" ? "USD" : "ARS";
    const foreignAmount = body.foreignAmount != null ? parseAmount(String(body.foreignAmount)) : null;
    const exchangeRate = body.exchangeRate != null ? parseAmount(String(body.exchangeRate)) : null;

    if (!date) return json({ error: "La fecha no es válida." }, 400);
    if (amount == null || amount < 0) return json({ error: "El importe no es válido." }, 400);
    if (!isPaymentCategory(category) || !isCategoryForLine(category, line)) {
      return json({ error: "El evento no corresponde a la línea seleccionada." }, 400);
    }

    const status: PaymentStatus = body.status === "pagado" ? "pagado" : "pendiente";
    const [created] = await db
      .insert(payments)
      .values({
        line,
        currency,
        foreignAmount: foreignAmount != null ? foreignAmount.toFixed(4) : null,
        exchangeRate: exchangeRate != null ? exchangeRate.toFixed(4) : null,
        exchangeRateSource: body.exchangeRateSource?.trim() ?? null,
        date,
        amount: amount.toFixed(2),
        category: category as PaymentCategory,
        beneficiary: body.beneficiary?.trim() ?? "",
        description: body.description?.trim() ?? "",
        notes: body.notes?.trim() ?? "",
        status,
        createdBy: user.id,
        paidAt: status === "pagado" ? new Date() : null,
        paidBy: status === "pagado" ? user.id : null,
      })
      .returning();

    const [creator] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    return json({ payment: toPaymentDTO(created, creator?.name ?? user.name, status === "pagado" ? user.name : null) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));
    const lineParam = Number(url.searchParams.get("line") ?? "1");
    const line: TreasuryLine = lineParam === 2 ? 2 : 1;
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return json({ error: "Año o mes inválido." }, 400);
    }

    const from = `${year}-${pad2(month)}-01`;
    const last = new Date(Date.UTC(year, month, 0));
    const to = `${last.getUTCFullYear()}-${pad2(last.getUTCMonth() + 1)}-${pad2(last.getUTCDate())}`;
    const deleted = await db
      .delete(payments)
      .where(and(eq(payments.line, line), gte(payments.date, from), lte(payments.date, to)))
      .returning({ id: payments.id });

    return json({ deleted: deleted.length, from, to });
  } catch (error) {
    return errorResponse(error);
  }
}
