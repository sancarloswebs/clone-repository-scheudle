import { errorResponse, json } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ user: null }, 401);
    return json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
