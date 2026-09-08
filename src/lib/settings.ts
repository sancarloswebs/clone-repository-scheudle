import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import type { AppSettings } from "@/lib/types";

const DEFAULTS = {
  companyName: "Aserradero San Cayetano S.R.L",
  weeklyCap: "20000000.00",
  checksWeeklyCap: "10000000.00",
  greenMax: "15000000.00",
  yellowMax: "30000000.00",
};

async function ensureColumns() {
  await db.execute(sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS checks_weekly_cap numeric(18,2) NOT NULL DEFAULT '10000000'
  `);
}

function toSettings(row: typeof settings.$inferSelect): AppSettings {
  return {
    id: row.id,
    companyName: row.companyName,
    weeklyCap: row.weeklyCap,
    checksWeeklyCap: row.checksWeeklyCap,
    greenMax: row.greenMax,
    yellowMax: row.yellowMax,
  };
}

export async function getSettings(): Promise<AppSettings> {
  let existing;
  try {
    existing = await db.select().from(settings).limit(1);
  } catch {
    await ensureColumns();
    existing = await db.select().from(settings).limit(1);
  }
  if (existing[0]) {
    if (existing[0].companyName.includes("Tesorería")) {
      const [renamed] = await db
        .update(settings)
        .set({ companyName: DEFAULTS.companyName, updatedAt: new Date() })
        .where(eq(settings.id, existing[0].id))
        .returning();
      return toSettings(renamed);
    }
    return toSettings(existing[0]);
  }

  const [created] = await db.insert(settings).values(DEFAULTS).returning();
  return toSettings(created);
}

export async function updateSettings(input: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const [updated] = await db
    .update(settings)
    .set({
      companyName: input.companyName ?? current.companyName,
      weeklyCap: input.weeklyCap ?? current.weeklyCap,
      checksWeeklyCap: input.checksWeeklyCap ?? current.checksWeeklyCap,
      greenMax: input.greenMax ?? current.greenMax,
      yellowMax: input.yellowMax ?? current.yellowMax,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, current.id))
    .returning();

  return toSettings(updated);
}
