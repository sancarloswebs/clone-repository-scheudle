export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = String(value).trim();
  if (!normalized) return 0;
  const asNumber = Number(normalized);
  return Number.isFinite(asNumber) ? asNumber : 0;
}

export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/\s/g, "").replace(/\$/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const decimals = cleaned.length - lastComma - 1;
    normalized = decimals <= 2 ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (lastDot > -1) {
    const decimals = cleaned.length - lastDot - 1;
    if (decimals === 3 && cleaned.split(".").length > 2) {
      normalized = cleaned.replace(/\./g, "");
    }
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100) / 100;
}

export function formatARS(value: string | number, options?: { compact?: boolean }): string {
  const amount = toNumber(value);
  if (options?.compact && Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: millions >= 100 ? 0 : 1,
      maximumFractionDigits: millions >= 100 ? 1 : 2,
    }).format(millions);
    return `$${formatted} M`;
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPlain(value: string | number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export type TrafficLevel = "green" | "yellow" | "red";

export function trafficLevel(total: number, greenMax: number, yellowMax: number): TrafficLevel {
  if (total < greenMax) return "green";
  if (total <= yellowMax) return "yellow";
  return "red";
}

export const TRAFFIC_LABEL: Record<TrafficLevel, string> = {
  green: "Dentro de lo esperado",
  yellow: "Atención",
  red: "Crítico",
};
