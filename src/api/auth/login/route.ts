import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { createSession, setSessionCookie, toPublicUser, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return json({ error: "Ingresá email y contraseña." }, 400);
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return json({ error: "Credenciales inválidas." }, 401);
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);
    return json({ user: toPublicUser(user), token });
  } catch (error) {
    return errorResponse(error);
  }
}
