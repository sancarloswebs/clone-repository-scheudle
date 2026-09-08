import { errorResponse, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { seedDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdmin();
    const result = await seedDemoData({ resetPayments: false });
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
