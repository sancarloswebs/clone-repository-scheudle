import { sampleCsv } from "@/lib/import-export";
import { getActor } from "@/lib/actor";
import { errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getActor();
    return new Response(sampleCsv(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="plantilla-pagos.csv"',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
