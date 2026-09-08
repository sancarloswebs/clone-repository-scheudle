import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { createSession, setSessionCookie, toPublicUser, verifyPassword } from "@/lib/auth";
import { ensureDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDemoData();
    const body = (await request.json()) as { email?: string; username?: string; password?: string };
    const login = (body.username ?? body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!login || !password) {
      return json({ error: "Ingresá usuario y contraseña." }, 400);
    }

    const emails = login.includes("@") ? [login] : [login, `${login}@tesoreria.com`];
    const [user] = await db
      .select()
      .from(users)
      .where(or(...emails.map((value) => eq(users.email, value))))
      .limit(1);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return json({ error: "Usuario o contraseña incorrectos." }, 401);
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);
    return json({ user: toPublicUser(user), token });
  } catch (error) {
    return errorResponse(error);
  }
}
