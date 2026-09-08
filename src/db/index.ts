import { drizzle } from "drizzle-orm/postgres-js";
import { setDefaultResultOrder } from "node:dns";
import postgres from "postgres";

try {
  setDefaultResultOrder("ipv4first");
} catch {
  // ignore on runtimes without this API
}

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("Falta DATABASE_URL en Vercel. Settings → Environment Variables → Redeploy.");
  }
  let url = raw.replace(/^["']|["']$/g, "");
  const isSupabase = /supabase/i.test(url);
  if (isSupabase && url.includes(":6543") && !/pgbouncer=/i.test(url)) {
    url += `${url.includes("?") ? "&" : "?"}pgbouncer=true`;
  }
  if (isSupabase && !/sslmode=/i.test(url)) {
    url += `${url.includes("?") ? "&" : "?"}sslmode=require`;
  }
  return url;
}

const globalForDb = globalThis as typeof globalThis & {
  __sancayetanoSql?: ReturnType<typeof postgres>;
};

const databaseUrl = resolveDatabaseUrl();
const sqlClient =
  globalForDb.__sancayetanoSql ??
  postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
    ssl: /supabase/i.test(databaseUrl) ? "require" : undefined,
  });

globalForDb.__sancayetanoSql = sqlClient;

export const db = drizzle(sqlClient);
