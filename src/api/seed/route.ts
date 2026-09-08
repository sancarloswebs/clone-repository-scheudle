import { errorResponse, json } from "@/lib/api";
import { getActor } from "@/lib/actor";
import { seedDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await getActor();
    const body = (await request.json().catch(() => ({}))) as { reset?: boolean };
    const result = await seedDemoData({ resetPayments: Boolean(body.reset) });
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
