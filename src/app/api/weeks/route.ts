import { errorResponse, json } from "@/lib/api";
import { getActor } from "@/lib/actor";
import { listPayments } from "@/lib/payments";
import { buildWeekSummaries } from "@/lib/weeks";
import { getSettings } from "@/lib/settings";
import type { TreasuryLine } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await getActor();
    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));
    const lineParam = Number(url.searchParams.get("line") ?? "1");
    const line: TreasuryLine = lineParam === 2 ? 2 : 1;

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return json({ error: "Año o mes inválido." }, 400);
    }

    const [items, settings] = await Promise.all([listPayments({ line }), getSettings()]);
    const weeks = buildWeekSummaries(items, year, month - 1, settings);
    return json({ weeks, settings, payments: items });
  } catch (error) {
    return errorResponse(error);
  }
}
