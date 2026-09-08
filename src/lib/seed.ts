import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, settings, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import type { PaymentCategory, PaymentStatus } from "@/lib/categories";

type SeedPayment = {
  date: string;
  amount: string;
  category: PaymentCategory;
  beneficiary: string;
  description: string;
  status: PaymentStatus;
};

const DEMO_PAYMENTS: SeedPayment[] = [];

const globalForSeed = globalThis as typeof globalThis & {
  __sancayetanoReady?: boolean;
  __sancayetanoBoot?: Promise<void>;
};

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'operador',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token text NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_idx ON sessions (token)`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS settings (
      id serial PRIMARY KEY,
      company_name text NOT NULL DEFAULT 'Tesorería',
      weekly_cap numeric(18,2) NOT NULL DEFAULT '20000000',
      checks_weekly_cap numeric(18,2) NOT NULL DEFAULT '10000000',
      green_max numeric(18,2) NOT NULL DEFAULT '15000000',
      yellow_max numeric(18,2) NOT NULL DEFAULT '30000000',
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS checks_weekly_cap numeric(18,2) NOT NULL DEFAULT '10000000'
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payments (
      id serial PRIMARY KEY,
      line integer NOT NULL DEFAULT 1,
      date date NOT NULL,
      amount numeric(18,2) NOT NULL,
      category text NOT NULL,
      beneficiary text NOT NULL DEFAULT '',
      description text NOT NULL DEFAULT '',
      notes text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'pendiente',
      created_by integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      paid_at timestamptz,
      paid_by integer REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS line integer NOT NULL DEFAULT 1`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ARS'`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS foreign_amount numeric(18,4)`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS exchange_rate numeric(18,4)`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS exchange_rate_source text`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS payments_line_date_idx ON payments (line, date)`);
}

async function bootstrap(): Promise<void> {
  await ensureTables();
  try {
    const existing = await db.select({ id: users.id, email: users.email }).from(users).limit(5);
    const hasAdmin = existing.some((item) => item.email === "admin@tesoreria.com");
    const hasViewer = existing.some((item) => item.email === "viewer@tesoreria.com");
    if (hasAdmin && hasViewer) return;
  } catch {
    // Tables are ensured above; this fallback is intentionally empty.
  }

  let [admin] = await db.select().from(users).where(eq(users.email, "admin@tesoreria.com")).limit(1);
  if (!admin) {
    [admin] = await db
      .insert(users)
      .values({
        name: "Administrador",
        email: "admin@tesoreria.com",
        passwordHash: await hashPassword("admin123"),
        role: "admin",
      })
      .returning();
  }

  let [viewer] = await db.select().from(users).where(eq(users.email, "viewer@tesoreria.com")).limit(1);
  if (!viewer) {
    await db.insert(users).values({
      name: "Visitante",
      email: "viewer@tesoreria.com",
      passwordHash: await hashPassword("visitor"),
      role: "viewer",
    });
  }

  const existingSettings = await db.select({ id: settings.id }).from(settings).limit(1);
  if (!existingSettings[0]) {
    await db.insert(settings).values({
      companyName: "Aserradero San Cayetano S.R.L",
      weeklyCap: "20000000.00",
      checksWeeklyCap: "10000000.00",
      greenMax: "15000000.00",
      yellowMax: "30000000.00",
    });
  }

  void DEMO_PAYMENTS;
  void admin;
}

export async function ensureDemoData(): Promise<void> {
  if (globalForSeed.__sancayetanoReady) return;
  if (!globalForSeed.__sancayetanoBoot) {
    globalForSeed.__sancayetanoBoot = bootstrap()
      .then(() => {
        globalForSeed.__sancayetanoReady = true;
      })
      .catch((error) => {
        globalForSeed.__sancayetanoBoot = undefined;
        throw error;
      });
  }
  await globalForSeed.__sancayetanoBoot;
}

export async function seedDemoData(options?: { resetPayments?: boolean }): Promise<{
  adminId: number;
  operatorId: number;
  payments: number;
}> {
  await ensureDemoData();
  if (options?.resetPayments) {
    await db.delete(payments);
  }
  const [admin] = await db.select().from(users).where(eq(users.email, "admin@tesoreria.com")).limit(1);
  const [viewer] = await db.select().from(users).where(eq(users.email, "viewer@tesoreria.com")).limit(1);
  return { adminId: admin?.id ?? 0, operatorId: viewer?.id ?? 0, payments: 0 };
}
