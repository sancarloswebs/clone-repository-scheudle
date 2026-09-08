import { errorResponse } from "@/lib/api";
import { getActor } from "@/lib/actor";
import { buildCsv } from "@/lib/import-export";
import { listPayments } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await getActor();
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;
    const line = Number(url.searchParams.get("line") ?? "1") === 2 ? 2 : 1;
    const items = await listPayments({ from, to, line });
    const csv = buildCsv(items);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pagos-tesoreria.csv"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
