import { errorResponse, json } from "@/lib/api";
import { clearSessionCookie, destroySession, readSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await destroySession(await readSessionToken());
    await clearSessionCookie();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
