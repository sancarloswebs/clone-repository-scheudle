export const LINE1_CATEGORIES = [
  "Tarjeta de Crédito",
  "Cheques Físicos",
  "Cheques Electrónicos",
  "Planes ARCA",
  "Rehabilitación Planes ARCA",
  "Quincena Personal",
  "Cuota de Préstamos Bancarios",
  "Cobros por transferencia",
  "Cobro eCheq",
] as const;

export const LINE2_CATEGORIES = [
  "Pago con cheque físico",
  "Cobro con cheque físico",
  "Pago en dólares",
  "Cobro en dólares",
  "Pago en pesos arg",
  "Cobro en pesos arg",
  "Depósitos bancarios",
  "Extracciones bancarias",
] as const;

export const PAYMENT_CATEGORIES = [...LINE1_CATEGORIES, ...LINE2_CATEGORIES, "Pago en euros", "Cobro en euros"] as const;

export type PaymentCategory = (typeof PAYMENT_CATEGORIES)[number];
export type PaymentStatus = "pendiente" | "pagado";
export type TreasuryLine = 1 | 2;

export const CATEGORY_META: Record<PaymentCategory, { color: string; bg: string; short: string }> = {
  "Tarjeta de Crédito": { color: "#818cf8", bg: "rgba(99, 102, 241, 0.18)", short: "Tarjeta" },
  "Cheques Físicos": { color: "#84cc16", bg: "rgba(132, 204, 22, 0.18)", short: "Ch. Físicos" },
  "Cheques Electrónicos": { color: "#a78bfa", bg: "rgba(167, 139, 250, 0.18)", short: "ECHEQ" },
  "Planes ARCA": { color: "#fbbf24", bg: "rgba(245, 158, 11, 0.18)", short: "ARCA" },
  "Rehabilitación Planes ARCA": { color: "#fb923c", bg: "rgba(249, 115, 22, 0.18)", short: "Rehab. ARCA" },
  "Quincena Personal": { color: "#c084fc", bg: "rgba(139, 92, 246, 0.18)", short: "Sueldos" },
  "Cuota de Préstamos Bancarios": { color: "#f472b6", bg: "rgba(236, 72, 153, 0.18)", short: "Préstamos" },
  "Cobros por transferencia": { color: "#34d399", bg: "rgba(52, 211, 153, 0.18)", short: "Transferencia" },
  "Cobro eCheq": { color: "#2dd4bf", bg: "rgba(45, 212, 191, 0.18)", short: "eCheq" },
  "Pago con cheque físico": { color: "#a3e635", bg: "rgba(163, 230, 53, 0.18)", short: "Ch. físico" },
  "Cobro con cheque físico": { color: "#bef264", bg: "rgba(190, 242, 100, 0.18)", short: "Ch. físico" },
  "Pago en dólares": { color: "#60a5fa", bg: "rgba(96, 165, 250, 0.18)", short: "Dólares" },
  "Cobro en dólares": { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.18)", short: "Dólares" },
  "Cobro en euros": { color: "#a78bfa", bg: "rgba(167, 139, 250, 0.18)", short: "Euros" },
  "Pago en euros": { color: "#c4b5fd", bg: "rgba(196, 181, 253, 0.18)", short: "Euros" },
  "Pago en pesos arg": { color: "#fb7185", bg: "rgba(251, 113, 133, 0.18)", short: "Pesos" },
  "Cobro en pesos arg": { color: "#4ade80", bg: "rgba(74, 222, 128, 0.18)", short: "Pesos" },
  "Depósitos bancarios": { color: "#2dd4bf", bg: "rgba(45, 212, 191, 0.18)", short: "Depósitos" },
  "Extracciones bancarias": { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.18)", short: "Extracciones" },
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const CATEGORY_ALIASES: Record<string, PaymentCategory> = {
  "tarjeta de credito": "Tarjeta de Crédito", tarjeta: "Tarjeta de Crédito", "tarjetas de credito": "Tarjeta de Crédito",
  "cheques fisicos": "Cheques Físicos", "cheque fisico": "Cheques Físicos",
  "cheques electronicos": "Cheques Electrónicos", "cheque electronico": "Cheques Electrónicos", echeq: "Cheques Electrónicos", echeqs: "Cheques Electrónicos",
  "planes arca": "Planes ARCA", arca: "Planes ARCA", "rehabilitacion planes arca": "Rehabilitación Planes ARCA", "rehab arca": "Rehabilitación Planes ARCA", rehabilitacion: "Rehabilitación Planes ARCA",
  "quincena personal": "Quincena Personal", "quincena personal (salarios)": "Quincena Personal", salarios: "Quincena Personal", sueldos: "Quincena Personal",
  "cuota de prestamos bancarios": "Cuota de Préstamos Bancarios", prestamos: "Cuota de Préstamos Bancarios", prestamo: "Cuota de Préstamos Bancarios",
  "cobros por transferencia": "Cobros por transferencia", "cobro por transferencia": "Cobros por transferencia", transferencia: "Cobros por transferencia",
  "cobro echeq": "Cobro eCheq", "cobros echeq": "Cobro eCheq",
  "pago con cheque fisico": "Pago con cheque físico", "cobro con cheque fisico": "Cobro con cheque físico",
  "pago en dolares": "Pago en dólares", "cobro en dolares": "Cobro en dólares",
  "pago en euros": "Pago en euros", "cobro en euros": "Cobro en euros",
  "pago en pesos arg": "Pago en pesos arg", "cobro en pesos arg": "Cobro en pesos arg",
  "depositos bancarios": "Depósitos bancarios", "extracciones bancarias": "Extracciones bancarias",
};

export const CHECK_CATEGORIES = ["Cheques Físicos", "Cheques Electrónicos", "Pago con cheque físico", "Cobro con cheque físico"] as const;

export function isCheckCategory(value: string): boolean {
  return (CHECK_CATEGORIES as readonly string[]).includes(value);
}

export function isPaymentCategory(value: string): value is PaymentCategory {
  return (PAYMENT_CATEGORIES as readonly string[]).includes(value);
}

export function categoriesForLine(line: TreasuryLine): readonly PaymentCategory[] {
  return line === 2 ? LINE2_CATEGORIES : LINE1_CATEGORIES;
}


export function isCategoryForLine(category: string, line: TreasuryLine): boolean {
  return (categoriesForLine(line) as readonly string[]).includes(category);
}

export function isLine1CollectedCategory(value: string): boolean {
  return ["Cobros por transferencia", "Cobro eCheq"].includes(value);
}

export function isIncomeCategory(value: string): boolean {
  return ["Cobros por transferencia", "Cobro eCheq", "Cobro con cheque físico", "Cobro en dólares", "Cobro en euros", "Cobro en pesos arg", "Extracciones bancarias"].includes(value);
}

export function isExpenseCategory(value: string): boolean {
  return isPaymentCategory(value) && !isIncomeCategory(value);
}

export function parseCategory(raw: string): PaymentCategory | null {
  const trimmed = raw.trim();
  if (isPaymentCategory(trimmed)) return trimmed;
  return CATEGORY_ALIASES[stripAccents(trimmed)] ?? null;
}

export function parseStatus(raw: string): PaymentStatus {
  const value = stripAccents(raw);
  if (value === "pagado" || value === "pago" || value === "paid") return "pagado";
  return "pendiente";
}
