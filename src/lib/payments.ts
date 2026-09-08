import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { PAYMENT_CATEGORIES, isPaymentCategory, type PaymentCategory, type PaymentStatus, type TreasuryLine } from "@/lib/categories";
import { normalizeDateString } from "@/lib/dates";
import type { PaymentDTO } from "@/lib/types";

const creator = db
  .select({ id: users.id, name: users.name })
  .from(users)
  .as("creator");

const payer = db
  .select({ id: users.id, name: users.name })
  .from(users)
  .as("payer");

export async function listPayments(filters?: {
  from?: string;
  to?: string;
  status?: PaymentStatus;
  category?: PaymentCategory;
  line?: TreasuryLine;
}): Promise<PaymentDTO[]> {
  const conditions = [];
  if (filters?.from) conditions.push(gte(payments.date, filters.from));
  if (filters?.to) conditions.push(lte(payments.date, filters.to));
  if (filters?.status) conditions.push(eq(payments.status, filters.status));
  if (filters?.category) conditions.push(eq(payments.category, filters.category));
  if (filters?.line) conditions.push(eq(payments.line, filters.line));

  const rows = await db
    .select({
      payment: payments,
      createdByName: creator.name,
      paidByName: payer.name,
    })
    .from(payments)
    .innerJoin(creator, eq(payments.createdBy, creator.id))
    .leftJoin(payer, eq(payments.paidBy, payer.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(payments.date), asc(payments.id));

  return rows.map((row) => toPaymentDTO(row.payment, row.createdByName, row.paidByName));
}

export function toPaymentDTO(
  payment: typeof payments.$inferSelect,
  createdByName: string,
  paidByName: string | null,
): PaymentDTO {
  const category = isPaymentCategory(payment.category)
    ? payment.category
    : PAYMENT_CATEGORIES[0];
  const status: PaymentStatus = payment.status === "pagado" ? "pagado" : "pendiente";

  return {
    id: payment.id,
    line: payment.line === 2 ? 2 : 1,
    currency: payment.currency,
    foreignAmount: payment.foreignAmount,
    exchangeRate: payment.exchangeRate,
    exchangeRateSource: payment.exchangeRateSource,
    date: normalizeDateString(payment.date),
    amount: payment.amount,
    category,
    beneficiary: payment.beneficiary,
    description: payment.description,
    notes: payment.notes,
    status,
    createdBy: payment.createdBy,
    createdByName,
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    paidBy: payment.paidBy,
    paidByName,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export async function countUsers(): Promise<number> {
  const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(users);
  return row?.value ?? 0;
}
