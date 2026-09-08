import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import type { PublicUser } from "@/lib/types";

export const SESSION_COOKIE = "tesoreria_session";
const SESSION_DAYS = 30;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (passwordHash.startsWith("$2")) {
    return bcrypt.compare(password, passwordHash);
  }

  const [algo, salt, key] = passwordHash.split(":");
  if (algo !== "scrypt" || !salt || !key) return false;
  const hashed = scryptSync(password, salt, 64);
  const stored = Buffer.from(key, "hex");
  return hashed.length === stored.length && timingSafeEqual(hashed, stored);
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<string> {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    userId,
    token: hashToken(token),
    expiresAt,
  });
  return token;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.token, hashToken(token)));
}

function cookieOptions(maxAge: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    sameSite: (secure ? "none" : "lax") as "none" | "lax",
    secure,
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 24 * 60 * 60));
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", cookieOptions(0));
}

export async function readSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  const fromCookie = jar.get(SESSION_COOKIE)?.value;
  if (fromCookie) return fromCookie;

  const headerStore = await headers();
  const authorization = headerStore.get("authorization") ?? headerStore.get("Authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return undefined;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  try {
    const token = await readSessionToken();
    if (!token) return null;

    const [row] = await db
      .select({
        user: users,
        expiresAt: sessions.expiresAt,
        sessionId: sessions.id,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.token, hashToken(token)))
      .limit(1);

    if (!row) return null;
    if (row.expiresAt.getTime() < Date.now()) {
      await db.delete(sessions).where(eq(sessions.id, row.sessionId));
      return null;
    }

    return toPublicUser(row.user);
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("No autorizado");
  }
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    const error = new AuthError("Solo el administrador puede hacer cambios.");
    error.status = 403;
    throw error;
  }
  return user;
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
