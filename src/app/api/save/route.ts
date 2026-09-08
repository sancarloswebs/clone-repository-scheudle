import { errorResponse, json } from "@/lib/api";
import { getActor } from "@/lib/actor";
import { listPayments } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import type { TreasuryLine } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await getActor();
    const lineParam = Number(new URL(request.url).searchParams.get("line") ?? "1");
    const line: TreasuryLine = lineParam === 2 ? 2 : 1;
    const [items, settings] = await Promise.all([listPayments({ line }), getSettings()]);
    return json({
      ok: true,
      savedAt: new Date().toISOString(),
      payments: items.length,
      companyName: settings.companyName,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
