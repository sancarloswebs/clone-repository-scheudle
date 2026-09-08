import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { createSession, hashPassword, setSessionCookie, toPublicUser } from "@/lib/auth";
import { countUsers } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (name.length < 2) return json({ error: "El nombre es demasiado corto." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email inválido." }, 400);
    if (password.length < 6) return json({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) return json({ error: "Ese email ya está registrado." }, 409);

    const total = await countUsers();
    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: await hashPassword(password),
        role: total === 0 ? "admin" : "operador",
      })
      .returning();

    const token = await createSession(user.id);
    await setSessionCookie(token);
    return json({ user: toPublicUser(user), token }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
