import { db } from "@/db";
import { payments } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { getActor } from "@/lib/actor";
import { parseSpreadsheet } from "@/lib/import-export";
import type { TreasuryLine } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getActor();
    const lineParam = Number(new URL(request.url).searchParams.get("line") ?? "1");
    const line: TreasuryLine = lineParam === 2 ? 2 : 1;
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return json({ error: "Adjuntá un archivo CSV o Excel." }, 400);
    }

    const filename = file.name || "archivo";
    const lower = filename.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      return json({ error: "Formato no soportado. Usá .csv, .xlsx o .xls." }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseSpreadsheet(buffer, filename);

    if (parsed.rows.length === 0) {
      return json({ created: 0, skipped: parsed.errors.length, errors: parsed.errors }, 400);
    }

    await db.insert(payments).values(
      parsed.rows.map((row) => ({
        line,
        date: row.date,
        amount: row.amount,
        category: row.category,
        beneficiary: row.beneficiary,
        description: row.description,
        notes: row.notes,
        status: row.status,
        createdBy: user.id,
        paidAt: row.status === "pagado" ? new Date() : null,
        paidBy: row.status === "pagado" ? user.id : null,
      })),
    );

    return json({
      created: parsed.rows.length,
      skipped: parsed.errors.length,
      errors: parsed.errors,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
